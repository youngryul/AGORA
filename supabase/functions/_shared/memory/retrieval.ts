// Memory Retrieval — Chat 코드와 분리된 검색 로직
// pgvector RPC(match_user_memories / match_relationship_memories)로 후보를 뽑고
// similarity + importance + recency + frequency 복합 점수로 정렬된 결과를 받는다.

import type { AdminClient } from '../supabase.ts';
import type { RetrievedMemory, RetrievedRelationshipMemory } from '../types.ts';
import { toPgVector } from '../vector.ts';
import { memoryConfig } from './config.ts';

interface SearchParams {
  userId: string;
  characterId: string;
  embedding: number[];
  limit?: number;
}

function weightParams() {
  const [s, i, r, f] = memoryConfig.weights;
  return { p_w_similarity: s, p_w_importance: i, p_w_recency: r, p_w_frequency: f };
}

/** GLOBAL MEMORY(character_id null) + 해당 인물의 CHARACTER MEMORY 검색 */
export async function searchUserMemories(db: AdminClient, params: SearchParams): Promise<RetrievedMemory[]> {
  const { data, error } = await db.rpc('agora_match_user_memories', {
    p_user_id: params.userId,
    p_character_id: params.characterId,
    p_query_embedding: toPgVector(params.embedding),
    p_match_count: params.limit ?? memoryConfig.userMemoryLimit,
    p_min_similarity: memoryConfig.minSimilarity,
    p_recency_half_life_days: memoryConfig.recencyHalfLifeDays,
    ...weightParams(),
  });
  if (error) throw error;
  return (data ?? []) as RetrievedMemory[];
}

export async function searchRelationshipMemories(
  db: AdminClient,
  params: SearchParams,
): Promise<RetrievedRelationshipMemory[]> {
  const { data, error } = await db.rpc('agora_match_relationship_memories', {
    p_user_id: params.userId,
    p_character_id: params.characterId,
    p_query_embedding: toPgVector(params.embedding),
    p_match_count: params.limit ?? memoryConfig.relationshipMemoryLimit,
    ...weightParams(),
  });
  if (error) throw error;
  return (data ?? []) as RetrievedRelationshipMemory[];
}

/** 프롬프트에 실제 사용된 기억의 access_count / last_accessed_at 갱신 (frequency 점수) */
export async function markMemoriesAccessed(
  db: AdminClient,
  memoryIds: string[],
  relationshipIds: string[],
): Promise<void> {
  const touch = async (fn: string, ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await db.rpc(fn, { p_ids: ids });
    if (error) console.error(fn, error);
  };
  await Promise.all([
    touch('agora_touch_user_memories', memoryIds),
    touch('agora_touch_relationship_memories', relationshipIds),
  ]);
}
