// 대화 / 사용자 / 인물 데이터 접근 (Service Role 클라이언트 사용 → 모든 쿼리에 user_id 를 명시)

import type { AdminClient } from '../supabase.ts';
import { HttpError } from '../http.ts';
import type {
  CharacterWithPersona,
  Persona,
  RelationshipProfile,
  SessionRecord,
  StoredMessage,
  UserAIProfile,
} from '../types.ts';

export async function loadSessionForUser(
  db: AdminClient,
  sessionId: string,
  userId: string,
): Promise<SessionRecord> {
  const { data, error } = await db
    .from('agora_chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Session not found');
  return data as SessionRecord;
}

export async function loadCharacterWithPersona(db: AdminClient, characterId: string): Promise<CharacterWithPersona> {
  const { data, error } = await db
    .from('agora_characters')
    .select('id, code, name, name_en, lifetime_label, short_philosophy, character_personas:agora_character_personas(persona, persona_prompt)')
    .eq('id', characterId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Character not found');

  const personaRow = Array.isArray(data.character_personas) ? data.character_personas[0] : data.character_personas;
  if (!personaRow) throw new HttpError(500, `Persona not configured for character ${data.code}`);

  return {
    id: data.id,
    code: data.code,
    name: data.name,
    name_en: data.name_en,
    lifetime_label: data.lifetime_label,
    short_philosophy: data.short_philosophy,
    persona: personaRow.persona as Persona,
    persona_prompt: personaRow.persona_prompt ?? null,
  };
}

/** Working Memory: 최근 N개 메시지를 시간순으로 */
export async function loadRecentMessages(db: AdminClient, sessionId: string, limit = 16): Promise<StoredMessage[]> {
  const { data, error } = await db
    .from('agora_chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as StoredMessage[]).reverse();
}

export async function loadMessagesSince(
  db: AdminClient,
  sessionId: string,
  since: string | null,
  limit = 80,
): Promise<StoredMessage[]> {
  let query = db
    .from('agora_chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (since) query = query.gt('created_at', since);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StoredMessage[];
}

export async function saveMessage(
  db: AdminClient,
  message: {
    sessionId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    metadata?: Record<string, unknown>;
  },
): Promise<string> {
  const { data, error } = await db
    .from('agora_chat_messages')
    .insert({
      session_id: message.sessionId,
      user_id: message.userId,
      role: message.role,
      content: message.content,
      metadata: message.metadata ?? {},
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export interface UserContext {
  nickname: string | null;
  memoryEnabled: boolean;
  profile: UserAIProfile | null;
}

export async function loadUserContext(db: AdminClient, userId: string): Promise<UserContext> {
  const [{ data: profileRow }, { data: aiRow }] = await Promise.all([
    db.from('agora_profiles').select('nickname, memory_enabled').eq('id', userId).maybeSingle(),
    db.from('agora_user_profiles_ai').select('summary, values, goals, preferences').eq('user_id', userId).maybeSingle(),
  ]);
  return {
    nickname: profileRow?.nickname ?? null,
    memoryEnabled: profileRow?.memory_enabled ?? true,
    profile: aiRow
      ? {
          summary: aiRow.summary ?? null,
          values: asStringArray(aiRow.values),
          goals: asStringArray(aiRow.goals),
          preferences: asStringArray(aiRow.preferences),
        }
      : null,
  };
}

export interface RelationshipStats {
  sessionCount: number;
  firstMetAt: string | null;
  profile: RelationshipProfile | null;
}

export async function loadRelationshipStats(
  db: AdminClient,
  userId: string,
  characterId: string,
): Promise<RelationshipStats> {
  const [{ count }, { data: first }, { data: profile }] = await Promise.all([
    db
      .from('agora_chat_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('character_id', characterId),
    db
      .from('agora_chat_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .order('started_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    db
      .from('agora_relationship_profiles')
      .select('summary, recent_change, themes')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle(),
  ]);
  return {
    sessionCount: count ?? 0,
    firstMetAt: first?.started_at ?? null,
    profile: profile
      ? { summary: profile.summary, recent_change: profile.recent_change, themes: asStringArray(profile.themes) }
      : null,
  };
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export function formatTranscript(messages: StoredMessage[], characterName: string): string {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? '사용자' : characterName}: ${m.content}`)
    .join('\n');
}

export function todayKST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
