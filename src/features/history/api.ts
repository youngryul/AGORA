import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import type { ChatSession } from '@/types/database';

export interface SessionListItem extends ChatSession {
  characters: { name: string; code: string; portrait_url: string | null } | null;
}

export function useSessionHistory() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agora_chat_sessions')
        .select(
          'id, user_id, character_id, topic, reflection, message_count, started_at, ended_at, characters:agora_characters(name, code, portrait_url)',
        )
        .gt('message_count', 0)
        .order('started_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as SessionListItem[];
    },
  });
}
