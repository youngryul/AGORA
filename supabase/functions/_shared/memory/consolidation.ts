// Memory Consolidation
// 비슷한 기억이 여러 개 쌓이면 상위 개념의 Semantic Memory 로 통합한다.
//  1) 같은 scope(global / 같은 인물) 안에서 임베딩 유사도로 클러스터링
//  2) 클러스터 크기가 3 이상이면 LLM 에게 통합 여부와 통합 문장을 요청
//  3) 통합 기억을 새로 저장하고, 원본은 archived = true, consolidated_into = 새 기억 id

import type { AdminClient } from '../supabase.ts';
import { embedOne, getLLM, memoryModel } from '../ai/index.ts';
import { CONSOLIDATE_MEMORY_SYSTEM, CONSOLIDATE_MEMORY_USER } from '../prompts/memory.ts';
import { render } from '../prompts/template.ts';
import { cosineSimilarity, fromPgVector, toPgVector } from '../vector.ts';
import { memoryConfig } from './config.ts';

interface MemoryRow {
  id: string;
  character_id: string | null;
  memory_type: string;
  content: string;
  importance: number;
  confidence: number;
  access_count: number;
  embedding: number[];
  created_at: string;
}

interface ConsolidationDecision {
  should_merge: boolean;
  content: string;
  importance: number;
  confidence: number;
}

export interface ConsolidationSummary {
  clustersFound: number;
  merged: number;
  archived: number;
}

const MAX_CLUSTERS_PER_RUN = 5;

function cluster(rows: MemoryRow[]): MemoryRow[][] {
  const visited = new Set<string>();
  const clusters: MemoryRow[][] = [];
  for (const seed of rows) {
    if (visited.has(seed.id)) continue;
    const group = [seed];
    for (const other of rows) {
      if (other.id === seed.id || visited.has(other.id)) continue;
      if (other.character_id !== seed.character_id) continue;
      if (cosineSimilarity(seed.embedding, other.embedding) >= memoryConfig.consolidationSimilarity) group.push(other);
    }
    if (group.length >= memoryConfig.consolidationMinCluster) {
      group.forEach((m) => visited.add(m.id));
      clusters.push(group.slice(0, 8));
    }
  }
  return clusters;
}

export async function consolidateUserMemories(db: AdminClient, userId: string): Promise<ConsolidationSummary> {
  const { data, error } = await db
    .from('agora_user_memories')
    .select('id, character_id, memory_type, content, importance, confidence, access_count, embedding, created_at')
    .eq('user_id', userId)
    .eq('archived', false)
    .not('embedding', 'is', null)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;

  const rows: MemoryRow[] = (data ?? [])
    .map((r) => ({ ...r, embedding: fromPgVector(r.embedding) }))
    .filter((r): r is MemoryRow => Array.isArray(r.embedding));

  const clusters = cluster(rows).slice(0, MAX_CLUSTERS_PER_RUN);
  const summary: ConsolidationSummary = { clustersFound: clusters.length, merged: 0, archived: 0 };

  for (const group of clusters) {
    const items = group
      .map((m) => `- (${m.memory_type}, 중요도 ${m.importance.toFixed(2)}, ${m.created_at.slice(0, 10)}) ${m.content}`)
      .join('\n');

    const decision = await getLLM().completeJSON<ConsolidationDecision>(
      [
        { role: 'system', content: CONSOLIDATE_MEMORY_SYSTEM },
        { role: 'user', content: render(CONSOLIDATE_MEMORY_USER, { items }) },
      ],
      { model: memoryModel() },
    );
    if (!decision?.should_merge || typeof decision.content !== 'string' || !decision.content.trim()) continue;

    const maxImportance = Math.max(...group.map((m) => m.importance));
    const embedding = toPgVector(await embedOne(decision.content));
    const { data: inserted, error: insertError } = await db
      .from('agora_user_memories')
      .insert({
        user_id: userId,
        character_id: group[0].character_id,
        memory_type: 'semantic',
        content: decision.content.trim().slice(0, 300),
        importance: Math.min(1, Math.max(maxImportance, Number(decision.importance) || maxImportance)),
        confidence: Math.min(1, Math.max(0.5, Number(decision.confidence) || 0.8)),
        embedding,
        access_count: group.reduce((sum, m) => sum + m.access_count, 0),
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

    const { error: archiveError } = await db
      .from('agora_user_memories')
      .update({ archived: true, consolidated_into: inserted.id })
      .in(
        'id',
        group.map((m) => m.id),
      )
      .eq('user_id', userId);
    if (archiveError) throw archiveError;

    summary.merged++;
    summary.archived += group.length;
  }
  return summary;
}
