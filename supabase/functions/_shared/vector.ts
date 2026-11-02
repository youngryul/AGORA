// pgvector 직렬화 / 역직렬화 유틸

/** number[] → pgvector 리터럴 ("[0.1,0.2,...]"). supabase-js 로 vector 컬럼/RPC 파라미터에 전달할 때 사용 */
export function toPgVector(v: number[]): string {
  return `[${v.join(',')}]`;
}

/** PostgREST 가 문자열로 돌려주는 vector 를 number[] 로 변환 */
export function fromPgVector(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as number[];
    } catch {
      return null;
    }
  }
  return null;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
