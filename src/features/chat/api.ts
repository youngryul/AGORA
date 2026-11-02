import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { invokeFunction } from '@/lib/supabase/functions';
import { queryKeys } from '@/lib/query-keys';
import type { ChatMessage, ChatSession } from '@/types/database';

const SESSION_COLUMNS = 'id, user_id, character_id, topic, reflection, message_count, started_at, ended_at';

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.session(sessionId ?? ''),
    enabled: Boolean(sessionId),
    queryFn: async () => {
      const { data, error } = await supabase.from('agora_chat_sessions').select(SESSION_COLUMNS).eq('id', sessionId!).single();
      if (error) throw error;
      return data as ChatSession;
    },
  });
}

export function useMessages(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages(sessionId ?? ''),
    enabled: Boolean(sessionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agora_chat_messages')
        .select('id, session_id, role, content, metadata, created_at')
        .eq('session_id', sessionId!)
        .neq('role', 'system')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ChatMessage[];
    },
  });
}

/** 세션 생성은 RLS(insert own)로 클라이언트에서 직접 수행한다 */
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { characterId: string; topic: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('로그인이 필요합니다.');
      const { data, error } = await supabase
        .from('agora_chat_sessions')
        .insert({ user_id: auth.user.id, character_id: input.characterId, topic: input.topic })
        .select(SESSION_COLUMNS)
        .single();
      if (error) throw error;
      return data as ChatSession;
    },
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.session(session.id), session);
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

/** 대화 종료: 인물의 한 문장 회고 생성 + 백그라운드 메모리 추출 */
export function useEndSession(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      invokeFunction<{ reflection: string | null; ended_at: string }>('generate-reflection', { session_id: sessionId }),
    onSuccess: (result) => {
      queryClient.setQueryData<ChatSession>(queryKeys.session(sessionId), (prev) =>
        prev ? { ...prev, reflection: result.reflection, ended_at: result.ended_at } : prev,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      // 메모리 추출은 서버에서 비동기로 진행되므로 잠시 후 갱신
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.memories });
        queryClient.invalidateQueries({ queryKey: queryKeys.relationships });
      }, 8000);
    },
  });
}
