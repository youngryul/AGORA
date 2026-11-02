import type { RiskAssessment } from '../types.ts';

// 1차 안전 장치: 규칙 기반 위험 신호 탐지.
// - 놓치는 것보다 과탐지가 낫다 (오탐 시에도 안전 확인 질문 한 번이 추가될 뿐이다).
// - 2차 장치로 SAFETY_SYSTEM_PROMPT 가 항상 모델에 포함되어, 규칙이 놓친 표현도 모델이 판단한다.

const CRISIS_PATTERNS: RegExp[] = [
  /죽고\s*싶/,
  /죽어\s*버리고\s*싶/,
  /자살/,
  /자해/,
  /목숨을?\s*끊/,
  /(삶|인생|생)을?\s*(끝내|마감하)/,
  /살고\s*싶지\s*않/,
  /살\s*이유가?\s*없/,
  /(손목|팔)을?\s*(긋|그었|그을)/,
  /뛰어\s*내리/,
  /투신/,
  /목을?\s*매/,
  /유서/,
  /(수면제|약)을?\s*(모아|한꺼번에|많이\s*먹)/,
  /세상에서\s*사라지/,
  /\bkill\s+myself\b/i,
  /\bsuicid/i,
  /\bend\s+(my|it)\s+(life|all)\b/i,
  /\bself[-\s]?harm/i,
  /\bwant\s+to\s+die\b/i,
];

const ELEVATED_PATTERNS: RegExp[] = [
  /사라지고\s*싶/,
  /없어지고\s*싶/,
  /살기\s*싫/,
  /다\s*(놓고|포기하고|끝내고)\s*싶/,
  /아무\s*의미가?\s*없/,
  /버틸\s*수\s*없/,
  /희망이?\s*없/,
  /나\s*같은\s*건\s*없어/,
  /\bhopeless\b/i,
  /\bcan'?t\s+go\s+on\b/i,
];

function matches(text: string, patterns: RegExp[]): string[] {
  const found: string[] = [];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) found.push(m[0]);
  }
  return found;
}

/**
 * @param current 현재 사용자 메시지
 * @param recentUserMessages 직전 사용자 메시지들 (위험 신호가 이어지는 대화에서 Safety Mode 를 유지하기 위함)
 */
export function assessRisk(current: string, recentUserMessages: string[] = []): RiskAssessment {
  const crisisNow = matches(current, CRISIS_PATTERNS);
  if (crisisNow.length > 0) return { level: 'crisis', matched: crisisNow };

  const elevatedNow = matches(current, ELEVATED_PATTERNS);
  const crisisRecent = recentUserMessages.slice(-3).flatMap((m) => matches(m, CRISIS_PATTERNS));

  if (crisisRecent.length > 0 || elevatedNow.length > 0) {
    return { level: 'elevated', matched: [...elevatedNow, ...crisisRecent] };
  }
  return { level: 'none', matched: [] };
}
