// Long-term Memory Extraction
//
// 대화 종료 시 또는 일정 메시지가 쌓였을 때 실행된다.
//  1) memory_enabled 확인 (false 면 아무것도 저장하지 않음)
//  2) 세션의 "아직 분석하지 않은 메시지" 구간을 낙관적 잠금으로 선점
//  3) LLM 이 JSON Schema 로 기억 후보 / 프로필 / 관계 변화를 반환
//  4) 필터링 → 임베딩 → 중복이면 기존 기억 강화, 아니면 새로 저장
//  5) 사용자 AI 프로필 / 관계 프로필 갱신

import type { AdminClient } from '../supabase.ts';
import { embedOne, getEmbedder, getLLM, memoryModel } from '../ai/index.ts';
import { EXTRACT_MEMORY_SYSTEM, EXTRACT_MEMORY_USER } from '../prompts/memory.ts';
import { bulletList, render } from '../prompts/template.ts';
import { assessRisk } from '../safety/risk-detector.ts';
import { toPgVector } from '../vector.ts';
import {
  asStringArray,
  formatTranscript,
  loadCharacterWithPersona,
  loadMessagesSince,
  loadRelationshipStats,
  loadSessionForUser,
  loadUserContext,
  todayKST,
} from '../conversation/repository.ts';
import { memoryConfig } from './config.ts';
import { consolidateUserMemories } from './consolidation.ts';

interface ExtractedMemory {
  type: 'episodic' | 'semantic' | 'relationship';
  scope: 'global' | 'character';
  content: string;
  importance: number;
  confidence: number;
}

interface ExtractionResult {
  memories?: ExtractedMemory[];
  profile_update?: { summary?: string | null; values?: string[]; goals?: string[]; preferences?: string[] } | null;
  relationship_update?: { summary?: string | null; recent_change?: string | null; themes?: string[] } | null;
}

export interface ExtractionSummary {
  status: 'done' | 'skipped';
  reason?: string;
  created: number;
  reinforced: number;
  relationship: number;
}

const clamp01 = (n: unknown, fallback: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;

function sanitize(raw: ExtractedMemory[] | undefined): ExtractedMemory[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 4)
    .map((m): ExtractedMemory => ({
      type: (['episodic', 'semantic', 'relationship'] as const).includes(m.type) ? m.type : 'episodic',
      scope: m.type === 'relationship' ? 'character' : m.scope === 'character' ? 'character' : 'global',
      content: m.content.trim().slice(0, 300),
      importance: clamp01(m.importance, 0.5),
      confidence: clamp01(m.confidence, 0.7),
    }))
    // 너무 사소하거나 불확실한 것은 기억하지 않는다
    .filter((m) => m.importance >= 0.35 && m.confidence >= 0.5)
    // 위험 표현의 구체적 내용은 기억에 남기지 않는다
    .filter((m) => assessRisk(m.content).level !== 'crisis')
    .slice(0, 8);
}

export async function extractAndStoreMemories(
  db: AdminClient,
  params: { userId: string; sessionId: string },
): Promise<ExtractionSummary> {
  const empty = { created: 0, reinforced: 0, relationship: 0 };
  const user = await loadUserContext(db, params.userId);
  if (!user.memoryEnabled) return { status: 'skipped', reason: 'memory_disabled', ...empty };

  const session = await loadSessionForUser(db, params.sessionId, params.userId);
  if (session.message_count <= session.memory_extracted_count) {
    return { status: 'skipped', reason: 'nothing_new', ...empty };
  }

  // --- 분석 구간 선점 (동시에 두 번 실행되어도 같은 메시지를 중복 분석하지 않도록) ---
  const claimAt = new Date().toISOString();
  let claim = db
    .from('agora_chat_sessions')
    .update({ last_memory_extraction_at: claimAt, memory_extracted_count: session.message_count })
    .eq('id', session.id)
    .eq('user_id', params.userId);
  claim = session.last_memory_extraction_at
    ? claim.eq('last_memory_extraction_at', session.last_memory_extraction_at)
    : claim.is('last_memory_extraction_at', null);
  const { data: claimed, error: claimError } = await claim.select('id');
  if (claimError) throw claimError;
  if (!claimed || claimed.length === 0) return { status: 'skipped', reason: 'already_running', ...empty };

  const rollback = () =>
    db
      .from('agora_chat_sessions')
      .update({
        last_memory_extraction_at: session.last_memory_extraction_at,
        memory_extracted_count: session.memory_extracted_count,
      })
      .eq('id', session.id)
      .eq('last_memory_extraction_at', claimAt);

  try {
    const claimTime = Date.parse(claimAt);
    const messages = (await loadMessagesSince(db, session.id, session.last_memory_extraction_at)).filter(
      (m) => Date.parse(m.created_at) <= claimTime,
    );
    if (!messages.some((m) => m.role === 'user')) return { status: 'skipped', reason: 'no_user_messages', ...empty };

    const character = await loadCharacterWithPersona(db, session.character_id);
    const [relationship, known] = await Promise.all([
      loadRelationshipStats(db, params.userId, character.id),
      loadKnownMemories(db, params.userId, character.id),
    ]);
    const today = todayKST();

    const prompt = render(EXTRACT_MEMORY_USER, {
      today,
      character_name: character.name,
      topic: session.topic ?? '정하지 않음',
      profile: user.profile?.summary
        ? `${user.profile.summary}\n가치: ${user.profile.values.join(', ')}\n목표: ${user.profile.goals.join(', ')}\n선호: ${user.profile.preferences.join(', ')}`
        : '(아직 없음)',
      relationship: relationship.profile?.summary
        ? `${relationship.profile.summary}\n주제: ${relationship.profile.themes.join(', ')}\n대화 횟수: ${relationship.sessionCount}`
        : `대화 횟수: ${relationship.sessionCount} (관계 요약 없음)`,
      known: known.length ? bulletList(known) : '(없음)',
      transcript: formatTranscript(messages, character.name),
    });

    const result = await getLLM().completeJSON<ExtractionResult>(
      [
        { role: 'system', content: render(EXTRACT_MEMORY_SYSTEM, { today, character_name: character.name }) },
        { role: 'user', content: prompt },
      ],
      { model: memoryModel() },
    );

    const memories = sanitize(result.memories);
    const summary = await storeMemories(db, {
      userId: params.userId,
      characterId: character.id,
      sessionId: session.id,
      memories,
    });

    await Promise.all([
      updateUserProfile(db, params.userId, result.profile_update),
      updateRelationshipProfile(db, params.userId, character.id, result.relationship_update),
    ]);

    // 기억이 많이 쌓였다면 유사 기억 통합
    const { count } = await db
      .from('agora_user_memories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', params.userId)
      .eq('archived', false);
    if ((count ?? 0) >= memoryConfig.consolidationTriggerCount && summary.created > 0) {
      await consolidateUserMemories(db, params.userId).catch((e) => console.error('[consolidate]', e));
    }

    return { status: 'done', ...summary };
  } catch (error) {
    await rollback();
    throw error;
  }
}

async function loadKnownMemories(db: AdminClient, userId: string, characterId: string): Promise<string[]> {
  const [{ data: memories }, { data: rel }] = await Promise.all([
    db
      .from('agora_user_memories')
      .select('content, character_id')
      .eq('user_id', userId)
      .eq('archived', false)
      .or(`character_id.is.null,character_id.eq.${characterId}`)
      .order('updated_at', { ascending: false })
      .limit(40),
    db
      .from('agora_relationship_memories')
      .select('content')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .order('updated_at', { ascending: false })
      .limit(15),
  ]);
  return [
    ...(memories ?? []).map((m) => m.content as string),
    ...(rel ?? []).map((m) => `(관계) ${m.content as string}`),
  ];
}

async function storeMemories(
  db: AdminClient,
  params: { userId: string; characterId: string; sessionId: string; memories: ExtractedMemory[] },
): Promise<{ created: number; reinforced: number; relationship: number }> {
  const result = { created: 0, reinforced: 0, relationship: 0 };
  if (params.memories.length === 0) return result;

  const vectors = await getEmbedder().embed(params.memories.map((m) => m.content));

  for (let i = 0; i < params.memories.length; i++) {
    const memory = params.memories[i];
    const embedding = toPgVector(vectors[i]);

    if (memory.type === 'relationship') {
      const { data: dup } = await db.rpc('agora_match_relationship_memories', {
        p_user_id: params.userId,
        p_character_id: params.characterId,
        p_query_embedding: embedding,
        p_match_count: 1,
        p_min_similarity: memoryConfig.duplicateSimilarity,
      });
      if (dup && dup.length > 0) {
        await db
          .from('agora_relationship_memories')
          .update({
            importance: Math.max(dup[0].importance, memory.importance),
            confidence: Math.max(dup[0].confidence, memory.confidence),
          })
          .eq('id', dup[0].id);
        result.reinforced++;
        continue;
      }
      const { error } = await db.from('agora_relationship_memories').insert({
        user_id: params.userId,
        character_id: params.characterId,
        content: memory.content,
        importance: memory.importance,
        confidence: memory.confidence,
        embedding,
        source_session_id: params.sessionId,
      });
      if (error) throw error;
      result.relationship++;
      continue;
    }

    const characterId = memory.scope === 'character' ? params.characterId : null;
    const { data: dup } = await db.rpc('agora_find_similar_user_memory', {
      p_user_id: params.userId,
      p_character_id: characterId,
      p_query_embedding: embedding,
      p_min_similarity: memoryConfig.duplicateSimilarity,
    });
    if (dup && dup.length > 0) {
      // 같은 의미의 기억이 이미 있으면 새로 만들지 않고 중요도/확신도를 강화한다
      await db
        .from('agora_user_memories')
        .update({
          importance: Math.min(1, Math.max(dup[0].importance, memory.importance) + 0.05),
          confidence: Math.max(dup[0].confidence, memory.confidence),
        })
        .eq('id', dup[0].id);
      result.reinforced++;
      continue;
    }

    const { error } = await db.from('agora_user_memories').insert({
      user_id: params.userId,
      character_id: characterId,
      memory_type: memory.type,
      content: memory.content,
      importance: memory.importance,
      confidence: memory.confidence,
      embedding,
      source_session_id: params.sessionId,
    });
    if (error) throw error;
    result.created++;
  }
  return result;
}

async function updateUserProfile(
  db: AdminClient,
  userId: string,
  update: ExtractionResult['profile_update'],
): Promise<void> {
  if (!update) return;
  const patch: Record<string, unknown> = {};
  if (typeof update.summary === 'string' && update.summary.trim()) patch.summary = update.summary.trim();
  const values = asStringArray(update.values).slice(0, 6);
  const goals = asStringArray(update.goals).slice(0, 5);
  const preferences = asStringArray(update.preferences).slice(0, 5);
  if (values.length) patch.values = values;
  if (goals.length) patch.goals = goals;
  if (preferences.length) patch.preferences = preferences;
  if (Object.keys(patch).length === 0) return;
  const { error } = await db.from('agora_user_profiles_ai').upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
  if (error) throw error;
}

async function updateRelationshipProfile(
  db: AdminClient,
  userId: string,
  characterId: string,
  update: ExtractionResult['relationship_update'],
): Promise<void> {
  if (!update) return;
  const patch: Record<string, unknown> = {};
  if (typeof update.summary === 'string' && update.summary.trim()) patch.summary = update.summary.trim();
  if (typeof update.recent_change === 'string' && update.recent_change.trim()) {
    patch.recent_change = update.recent_change.trim();
  }
  const themes = asStringArray(update.themes).slice(0, 6);
  if (themes.length) patch.themes = themes;
  if (Object.keys(patch).length === 0) return;
  const { error } = await db
    .from('agora_relationship_profiles')
    .upsert({ user_id: userId, character_id: characterId, ...patch }, { onConflict: 'user_id,character_id' });
  if (error) throw error;
}

/** 사용자가 Memory 내용을 직접 수정했을 때 재임베딩 */
export async function reembedText(text: string): Promise<string> {
  return toPgVector(await embedOne(text));
}
