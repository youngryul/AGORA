import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { streamChat } from '@/lib/ai/chat-stream';
import { FunctionError } from '@/lib/supabase/functions';
import { queryKeys } from '@/lib/query-keys';
import { useChatStore } from '@/stores/chat-store';

/**
 * 스트리밍 상태(Zustand)와 서버 상태(TanStack Query)를 분리한다.
 *  - 진행 중: chat-store.pending 에 낙관적 사용자 메시지 + 스트리밍 텍스트
 *  - 완료 후: messages 쿼리를 다시 불러와 DB 에 저장된 메시지로 교체
 *
 * 화면을 떠나도 서버는 응답 생성과 저장을 끝까지 진행하므로 스트림을 abort 하지 않는다.
 * 대신 세션이 바뀌면 runId 를 올려 이전 스트림의 이벤트가 새 화면에 섞이지 않도록 한다.
 */
export function useChatStream(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  const lastSessionRef = useRef<string | undefined>(undefined);

  // 세션 전환 시에만 초기화 (ref 가드: StrictMode 가 effect 를 다시 실행해도 진행 중인 스트림이 초기화되지 않는다)
  useEffect(() => {
    if (lastSessionRef.current === sessionId) return;
    lastSessionRef.current = sessionId;
    useChatStore.getState().reset();
  }, [sessionId]);

  const run = useCallback(
    async (payload: { message?: string; kickoff?: boolean }) => {
      if (!sessionId) return;
      const store = useChatStore.getState();
      if (store.status === 'waiting' || store.status === 'streaming') return;

      const runId = store.beginExchange(payload.message ?? null);
      const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.messages(sessionId) });

      try {
        for await (const event of streamChat({ sessionId, ...payload })) {
          if (event.type === 'meta') useChatStore.getState().setSafety(runId, event.safety);
          else if (event.type === 'delta') useChatStore.getState().appendDelta(runId, event.text);
          else if (event.type === 'error') throw new Error(event.message);
        }
        await refresh();
        useChatStore.getState().finishExchange(runId);
      } catch (error) {
        await refresh();
        // kickoff 가 이미 처리된 경우(다른 탭/중복 호출)는 조용히 동기화만 한다
        if (error instanceof FunctionError && error.status === 409 && payload.kickoff) {
          useChatStore.getState().finishExchange(runId);
          return;
        }
        useChatStore.getState().failExchange(runId, error instanceof Error ? error.message : '응답을 받지 못했습니다.');
      }
    },
    [sessionId, queryClient],
  );

  const send = useCallback((message: string) => run({ message }), [run]);
  const kickoff = useCallback(() => run({ kickoff: true }), [run]);

  return { send, kickoff };
}
