// 문서 Chunking: 문단 경계를 우선 존중하고, 긴 문단은 문장 단위로 나눈다.

export interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
}

function splitSentences(paragraph: string): string[] {
  return paragraph.match(/[^.!?。…]+[.!?。…]*["”』」)]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [paragraph];
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? 900;
  const overlap = options.overlapChars ?? 120;
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  // 1) 문단 → 너무 긴 문단은 문장 단위 조각으로
  const units: string[] = [];
  for (const paragraph of normalized.split(/\n\s*\n/)) {
    const p = paragraph.trim();
    if (!p) continue;
    if (p.length <= maxChars) units.push(p);
    else units.push(...splitSentences(p));
  }

  // 2) maxChars 안에서 조각을 이어 붙이고, 다음 청크는 직전 청크의 끝부분(overlap)으로 시작
  const chunks: string[] = [];
  let current = '';
  for (const unit of units) {
    const candidate = current ? `${current}\n\n${unit}` : unit;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    const tail = current.slice(-overlap);
    const boundary = tail.search(/[\s.!?]/);
    const carry = current && overlap > 0 ? tail.slice(boundary >= 0 ? boundary + 1 : 0).trim() : '';
    current = carry ? `${carry} ${unit}` : unit;
    // 단일 조각이 maxChars 를 넘는 경우 강제 분할
    while (current.length > maxChars) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(maxChars - overlap);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
