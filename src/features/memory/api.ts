import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { invokeFunction } from '@/lib/supabase/functions';
import { queryKeys } from '@/lib/query-keys';
import type { Profile, UserMemory, UserProfileAI } from '@/types/database';

const MEMORY_COLUMNS =
  'id, user_id, character_id, memory_type, content, importance, confidence, source_session_id, archived, created_at, updated_at, last_accessed_at, access_count';

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('agora_profiles').select('*').single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

export function useAIProfile() {
  return useQuery({
    queryKey: queryKeys.aiProfile,
    queryFn: async () => {
      const { data, error } = await supabase.from('agora_user_profiles_ai').select('*').maybeSingle();
      if (error) throw error;
      return data as UserProfileAI | null;
    },
  });
}

export function useMemories() {
  return useQuery({
    queryKey: queryKeys.memories,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agora_user_memories')
        .select(MEMORY_COLUMNS)
        .eq('archived', false)
        .order('importance', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as UserMemory[];
    },
  });
}

/** Memory 저장/사용 ON·OFF */
export function useSetMemoryEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const { error } = await supabase.from('agora_profiles').update({ memory_enabled: enabled }).eq('id', userId);
      if (error) throw error;
      return enabled;
    },
    onMutate: async ({ enabled }) => {
      queryClient.setQueryData<Profile>(queryKeys.profile, (prev) => (prev ? { ...prev, memory_enabled: enabled } : prev));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
  });
}

/** 수정은 Edge Function 경유 (내용이 바뀌면 임베딩도 다시 계산해야 하므로) */
export function useUpdateMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; content: string; kind?: 'user' | 'relationship' }) =>
      invokeFunction('update-memory', { memory_id: input.id, content: input.content, kind: input.kind ?? 'user' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memories });
      queryClient.invalidateQueries({ queryKey: queryKeys.relationships });
    },
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; kind?: 'user' | 'relationship' }) => {
      const table = input.kind === 'relationship' ? 'agora_relationship_memories' : 'agora_user_memories';
      const { error } = await supabase.from(table).delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memories });
      queryClient.invalidateQueries({ queryKey: queryKeys.relationships });
    },
  });
}

export function useDeleteAllMemories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('agora_delete_all_my_memories');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memories });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.relationships });
    },
  });
}

export function useConsolidateMemories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      invokeFunction<{ clustersFound: number; merged: number; archived: number }>('consolidate-memory', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.memories }),
  });
}
