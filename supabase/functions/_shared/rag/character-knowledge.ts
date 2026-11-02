// Character Knowledge RAG — 사용자 Memory 와 완전히 분리된 인물 지식 검색

import type { AdminClient } from '../supabase.ts';
import type { KnowledgeChunk } from '../types.ts';
import { toPgVector } from '../vector.ts';
import { memoryConfig } from '../memory/config.ts';

export async function searchCharacterKnowledge(
  db: AdminClient,
  characterId: string,
  embedding: number[],
  limit = memoryConfig.knowledgeLimit,
): Promise<KnowledgeChunk[]> {
  const { data, error } = await db.rpc('agora_match_character_documents', {
    p_character_id: characterId,
    p_query_embedding: toPgVector(embedding),
    p_match_count: limit,
    p_min_similarity: 0.2,
  });
  if (error) throw error;
  return (data ?? []) as KnowledgeChunk[];
}
