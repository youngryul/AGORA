import { create } from 'zustand';
import type { Character, ChatSession } from '@/types/database';
import type { SafetyLevel } from '@/lib/ai/chat-stream';

// 서버 상태(세션/메시지 목록)는 TanStack Query 가 관리하고,
// 이 스토어는 "현재 화면의 대화 문맥"과 "진행 중인 스트리밍"만 관리한다.

export type StreamStatus = 'idle' | 'waiting' | 'streaming' | 'error';

export interface PendingExchange {
  /** 서버 저장 전 낙관적으로 보여줄 사용자 메시지 */
  userMessage: string | null;
  /** 스트리밍 중인 인물의 답변 */
  assistantText: string;
}

interface ChatState {
  currentCharacter: Character | null;
  currentSession: ChatSession | null;
  /** 진행 중인 스트림 식별자. 다른 세션으로 이동하면 바뀌어, 이전 스트림의 이벤트를 무시한다. */
  runId: number;
  status: StreamStatus;
  pending: PendingExchange | null;
  safety: SafetyLevel;
  error: string | null;

  setCurrent: (character: Character | null, session: ChatSession | null) => void;
  beginExchange: (userMessage: string | null) => number;
  appendDelta: (runId: number, text: string) => void;
  setSafety: (runId: number, safety: SafetyLevel) => void;
  finishExchange: (runId: number) => void;
  failExchange: (runId: number, message: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentCharacter: null,
  currentSession: null,
  runId: 0,
  status: 'idle',
  pending: null,
  safety: 'none',
  error: null,

  setCurrent: (currentCharacter, currentSession) => set({ currentCharacter, currentSession }),
  beginExchange: (userMessage) => {
    const runId = get().runId + 1;
    set({ runId, status: 'waiting', pending: { userMessage, assistantText: '' }, error: null });
    return runId;
  },
  appendDelta: (runId, text) =>
    set((s) =>
      s.runId !== runId || !s.pending
        ? s
        : { status: 'streaming', pending: { ...s.pending, assistantText: s.pending.assistantText + text } },
    ),
  setSafety: (runId, safety) =>
    set((s) => (s.runId !== runId ? s : { safety: s.safety === 'crisis' ? 'crisis' : safety })),
  finishExchange: (runId) => set((s) => (s.runId !== runId ? s : { status: 'idle', pending: null })),
  failExchange: (runId, error) => set((s) => (s.runId !== runId ? s : { status: 'error', error })),
  reset: () => set((s) => ({ runId: s.runId + 1, status: 'idle', pending: null, safety: 'none', error: null })),
}));
