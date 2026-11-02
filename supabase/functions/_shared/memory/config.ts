import { optionalEnv } from '../env.ts';

// Memory Score 가중치 및 검색 파라미터.
//   memory_score = similarity*0.55 + importance*0.20 + recency*0.15 + frequency*0.10
// 배포 후 MEMORY_SCORE_WEIGHTS="0.6,0.2,0.1,0.1" 처럼 Secret 으로 조정할 수 있다.

function parseWeights(): [number, number, number, number] {
  const raw = optionalEnv('MEMORY_SCORE_WEIGHTS', '0.55,0.20,0.15,0.10');
  const parts = raw.split(',').map((n) => Number(n.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return [0.55, 0.2, 0.15, 0.1];
  return parts as [number, number, number, number];
}

export const memoryConfig = {
  weights: parseWeights(),
  /** LLM 컨텍스트에 넣을 Long-term Memory 수 (3~7 권장) */
  userMemoryLimit: Number(optionalEnv('MEMORY_CONTEXT_LIMIT', '5')),
  relationshipMemoryLimit: 3,
  knowledgeLimit: 4,
  minSimilarity: 0.25,
  recencyHalfLifeDays: 30,
  /** Working Memory: 최근 메시지 수 */
  workingMemoryMessages: 16,
  /** 이 수만큼 새 메시지가 쌓이면 대화 도중에도 메모리 추출 */
  extractEveryMessages: 12,
  /** 신규 기억이 기존 기억과 이 이상 유사하면 새로 만들지 않고 기존 기억을 강화 */
  duplicateSimilarity: 0.92,
  /** 통합 후보 클러스터 유사도 기준 */
  consolidationSimilarity: 0.8,
  consolidationMinCluster: 3,
  /** 활성 기억 수가 이 이상이면 추출 후 자동으로 통합 실행 */
  consolidationTriggerCount: 30,
};
