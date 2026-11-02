// 대화 컨텍스트 수집 — 검색 단계들을 병렬로 실행하고 PromptInput 을 만든다.
//   Recent Conversation → Long-term Memory → Relationship Memory → Character Knowledge RAG

import type { AdminClient } from '../supabase.ts';
import { embedOne } from '../ai/index.ts';
import type { ChatMessage } from '../ai/types.ts';
import type { PromptInput, PromptMode } from '../ai/prompt-builder.ts';
import { searchRelationshipMemories, searchUserMemories } from '../memory/retrieval.ts';
import { memoryConfig } from '../memory/config.ts';
import { searchCharacterKnowledge } from '../rag/character-knowledge.ts';
import { assessRisk } from '../safety/risk-detector.ts';
import type {
  CharacterWithPersona,
  KnowledgeChunk,
  RetrievedMemory,
  RetrievedRelationshipMemory,
  SessionRecord,
  StoredMessage,
} from '../types.ts';
import { loadRecentMessages, loadRelationshipStats, loadUserContext, todayKST } from './repository.ts';

export interface GatheredContext {
  prompt: PromptInput;
  memoryEnabled: boolean;
  usedMemoryIds: string[];
  usedRelationshipIds: string[];
  knowledgeSources: { title: string; source: string | null; verbatim: boolean }[];
}

async function safely<T>(label: string, task: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await task();
  } catch (error) {
    // 검색 하나가 실패해도 대화 자체는 계속 진행한다
    console.error(`[context:${label}]`, error);
    return fallback;
  }
}

/** 임베딩 검색 쿼리: 현재 메시지 + 직전 사용자 메시지 일부로 맥락을 보강 */
function buildSearchQuery(mode: PromptMode, current: string | null, recent: StoredMessage[], topic: string | null) {
  if (mode !== 'reply' || !current) {
    const lastUser = [...recent].reverse().find((m) => m.role === 'user')?.content ?? '';
    return [topic ?? '', lastUser].join('\n').trim() || '오늘의 대화';
  }
  const previousUser = recent.filter((m) => m.role === 'user').slice(-2, -1).map((m) => m.content);
  return [...previousUser, current].join('\n').slice(-2000);
}

export async function gatherContext(
  db: AdminClient,
  params: {
    mode: PromptMode;
    userId: string;
    session: SessionRecord;
    character: CharacterWithPersona;
    currentMessage: string | null;
  },
): Promise<GatheredContext> {
  const { mode, userId, session, character, currentMessage } = params;

  const [user, recent, relationshipStats] = await Promise.all([
    loadUserContext(db, userId),
    loadRecentMessages(db, session.id, memoryConfig.workingMemoryMessages + 1),
    loadRelationshipStats(db, userId, character.id),
  ]);

  // 현재 메시지는 이미 저장된 상태이므로 history 에서 제외
  const history: StoredMessage[] =
    currentMessage && recent.at(-1)?.role === 'user' && recent.at(-1)?.content === currentMessage
      ? recent.slice(0, -1)
      : recent.slice(-memoryConfig.workingMemoryMessages);

  const query = buildSearchQuery(mode, currentMessage, history, session.topic);
  const embedding = await safely('embed', () => embedOne(query), null as number[] | null);

  const [memories, relationshipMemories, knowledge] = embedding
    ? await Promise.all([
        user.memoryEnabled
          ? safely('memories', () => searchUserMemories(db, { userId, characterId: character.id, embedding }), [] as RetrievedMemory[])
          : Promise.resolve([] as RetrievedMemory[]),
        user.memoryEnabled
          ? safely(
              'relationship',
              () => searchRelationshipMemories(db, { userId, characterId: character.id, embedding }),
              [] as RetrievedRelationshipMemory[],
            )
          : Promise.resolve([] as RetrievedRelationshipMemory[]),
        safely('knowledge', () => searchCharacterKnowledge(db, character.id, embedding), [] as KnowledgeChunk[]),
      ])
    : [[], [], []];

  const priorUserMessages = history.filter((m) => m.role === 'user').map((m) => m.content);
  const risk = currentMessage
    ? assessRisk(currentMessage, priorUserMessages)
    : assessRisk('', priorUserMessages);

  const historyMessages: ChatMessage[] = history
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const prompt: PromptInput = {
    mode,
    character,
    nickname: user.nickname,
    profile: user.memoryEnabled ? user.profile : null,
    memories,
    relationship: user.memoryEnabled
      ? {
          profile: relationshipStats.profile,
          memories: relationshipMemories,
          sessionCount: relationshipStats.sessionCount,
          firstMetAt: relationshipStats.firstMetAt,
        }
      : null,
    knowledge,
    topic: session.topic,
    today: todayKST(),
    history: historyMessages,
    currentMessage,
    risk,
  };

  return {
    prompt,
    memoryEnabled: user.memoryEnabled,
    usedMemoryIds: memories.map((m) => m.id),
    usedRelationshipIds: relationshipMemories.map((m) => m.id),
    knowledgeSources: knowledge.map((k) => ({
      title: k.title,
      source: k.source,
      verbatim: k.source_type === 'primary_text' && k.metadata?.verbatim === true,
    })),
  };
}
