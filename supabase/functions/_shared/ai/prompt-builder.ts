// Prompt Builder
//
// 최종 LLM Prompt 조립 순서:
//   SYSTEM SAFETY
// + CHARACTER PERSONA
// + QUOTATION POLICY / RESPONSE GUIDELINES
// + CURRENT USER PROFILE
// + RELEVANT LONG-TERM MEMORY
// + RELATIONSHIP MEMORY
// + CHARACTER KNOWLEDGE RAG
// + THIS CONVERSATION (topic, date)
// + RECENT CONVERSATION (working memory)
// + [SAFETY MODE OVERRIDE]   ← 위험 신호가 있을 때 현재 메시지 바로 앞에 한 번 더 삽입
// + CURRENT USER MESSAGE
//
// 이 모듈은 문자열 조립만 담당한다. 검색/DB 접근은 memory/, rag/ 모듈이 담당한다.

import type { ChatMessage } from './types.ts';
import type {
  CharacterWithPersona,
  KnowledgeChunk,
  RelationshipProfile,
  RetrievedMemory,
  RetrievedRelationshipMemory,
  RiskAssessment,
  UserAIProfile,
} from '../types.ts';
import { CRISIS_OVERRIDE_PROMPT, ELEVATED_RISK_PROMPT, SAFETY_SYSTEM_PROMPT } from '../prompts/safety.ts';
import { renderPersona } from '../prompts/persona.ts';
import {
  KICKOFF_INSTRUCTION,
  KNOWLEDGE_TEMPLATE,
  MEMORY_TEMPLATE,
  QUOTATION_POLICY,
  RELATIONSHIP_TEMPLATE,
  RESPONSE_GUIDELINES,
  SESSION_TEMPLATE,
  USER_PROFILE_TEMPLATE,
} from '../prompts/chat-context.ts';
import { REFLECTION_INSTRUCTION } from '../prompts/reflection.ts';
import { joinSections, render } from '../prompts/template.ts';

export type PromptMode = 'reply' | 'kickoff' | 'reflection';

export interface RelationshipContext {
  profile: RelationshipProfile | null;
  memories: RetrievedRelationshipMemory[];
  sessionCount: number;
  firstMetAt: string | null;
}

export interface PromptInput {
  mode: PromptMode;
  character: CharacterWithPersona;
  nickname: string | null;
  profile: UserAIProfile | null;
  memories: RetrievedMemory[];
  relationship: RelationshipContext | null;
  knowledge: KnowledgeChunk[];
  topic: string | null;
  today: string;
  history: ChatMessage[];
  currentMessage: string | null;
  risk: RiskAssessment;
}

const MAX_HISTORY_CHARS = 12_000;

export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

// ---------------------------------------------------------------------------
// 블록별 렌더러
// ---------------------------------------------------------------------------

export function renderUserProfile(nickname: string | null, profile: UserAIProfile | null): string {
  const hasProfile =
    profile && (profile.summary || profile.values.length || profile.goals.length || profile.preferences.length);
  if (!nickname && !hasProfile) return '';
  return render(USER_PROFILE_TEMPLATE, {
    nickname: nickname ?? '(알 수 없음 — 이름을 부르지 말 것)',
    summary: profile?.summary ? `요약: ${profile.summary}` : '',
    values: profile?.values.length ? `중요하게 여기는 것: ${profile.values.join(', ')}` : '',
    goals: profile?.goals.length ? `목표/바람: ${profile.goals.join(', ')}` : '',
    preferences: profile?.preferences.length ? `대화 선호: ${profile.preferences.join(', ')}` : '',
  });
}

export function renderMemories(characterName: string, memories: RetrievedMemory[]): string {
  if (memories.length === 0) return '';
  const items = memories
    .map((m) => {
      const scope = m.character_id ? characterName : '공통';
      const kind = m.memory_type === 'episodic' ? '사건' : '특성';
      const certainty = m.confidence < 0.6 ? ' · 확실하지 않음' : '';
      return `- [${scope} · ${kind} · ${formatDate(m.created_at)}${certainty}] ${m.content}`;
    })
    .join('\n');
  return render(MEMORY_TEMPLATE, { name: characterName, items });
}

export function renderRelationship(ctx: RelationshipContext | null): string {
  if (!ctx) return '';
  const isFirst = ctx.sessionCount <= 1 && !ctx.profile?.summary && ctx.memories.length === 0;
  if (isFirst) {
    return '# RELATIONSHIP MEMORY\n이 사용자와는 오늘 처음 대화한다. 아직 서로를 모른다.';
  }
  return render(RELATIONSHIP_TEMPLATE, {
    session_count: ctx.sessionCount,
    first_met: ctx.firstMetAt ? ` (처음 만난 날: ${formatDate(ctx.firstMetAt)})` : '',
    summary: ctx.profile?.summary ? `관계 요약: ${ctx.profile.summary}` : '',
    recent_change: ctx.profile?.recent_change ? `최근의 변화: ${ctx.profile.recent_change}` : '',
    items: ctx.memories.length
      ? `관계의 기억:\n${ctx.memories.map((m) => `- [${formatDate(m.created_at)}] ${m.content}`).join('\n')}`
      : '',
  });
}

export function renderKnowledge(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return '';
  const items = chunks
    .map((c, i) => {
      const md = c.metadata ?? {};
      const verbatim = c.source_type === 'primary_text' && md.verbatim === true;
      const header = `[K${i + 1}]${verbatim ? ' [VERBATIM]' : ' [요약·해석 — 인용 불가]'} ${c.title}`;
      const lines = [header, `출처: ${c.source ?? '미상'}${md.source_location ? ` / 위치: ${md.source_location}` : ''}`];
      if (verbatim) {
        if (md.speaker) lines.push(`화자: ${md.speaker}`);
        if (md.original_text) lines.push(`원문: ${md.original_text}`);
        if (md.translated_text) lines.push(`번역: ${md.translated_text}`);
      }
      lines.push(c.content);
      return lines.join('\n');
    })
    .join('\n\n');
  return render(KNOWLEDGE_TEMPLATE, { items });
}

function renderSession(input: PromptInput): string {
  return render(SESSION_TEMPLATE, {
    today: input.today,
    topic: input.topic ?? '정하지 않음',
  });
}

function renderModeInstruction(mode: PromptMode): string {
  if (mode === 'kickoff') return KICKOFF_INSTRUCTION;
  if (mode === 'reflection') return REFLECTION_INSTRUCTION;
  return '';
}

/** 오래된 메시지부터 잘라 Working Memory 를 문자 예산 안으로 유지 */
export function trimHistory(history: ChatMessage[], maxChars = MAX_HISTORY_CHARS): ChatMessage[] {
  const result: ChatMessage[] = [];
  let total = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    total += history[i].content.length;
    if (total > maxChars && result.length > 0) break;
    result.unshift(history[i]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 조립
// ---------------------------------------------------------------------------

export function buildSystemPrompt(input: PromptInput): string {
  return joinSections([
    SAFETY_SYSTEM_PROMPT,
    renderPersona(input.character),
    QUOTATION_POLICY,
    RESPONSE_GUIDELINES,
    renderUserProfile(input.nickname, input.profile),
    renderMemories(input.character.name, input.memories),
    renderRelationship(input.relationship),
    renderKnowledge(input.knowledge),
    renderSession(input),
    input.risk.level === 'elevated' ? ELEVATED_RISK_PROMPT : '',
    renderModeInstruction(input.mode),
  ]);
}

export function buildChatMessages(input: PromptInput): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: buildSystemPrompt(input) }];

  messages.push(...trimHistory(input.history));

  if (input.risk.level === 'crisis') {
    // Persona 보다 Safety 가 우선한다는 것을 현재 메시지 바로 앞에서 다시 한 번 강제한다.
    messages.push({
      role: 'system',
      content: render(CRISIS_OVERRIDE_PROMPT, { matched: input.risk.matched.join(', ') }),
    });
  }

  if (input.currentMessage) {
    messages.push({ role: 'user', content: input.currentMessage });
  } else if (input.mode === 'kickoff') {
    messages.push({ role: 'user', content: '(사용자가 대화방에 들어왔습니다. 먼저 말을 건네 주세요.)' });
  } else if (input.mode === 'reflection') {
    messages.push({ role: 'user', content: '(사용자가 오늘의 대화를 마칩니다. 한 문장으로 정리해 주세요.)' });
  }

  return messages;
}
