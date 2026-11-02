import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import type { RelationshipMemory, RelationshipProfile } from '@/types/database';

export interface RelationshipOverview {
  characterId: string;
  sessionCount: number;
  firstMetAt: string | null;
  lastMetAt: string | null;
  topics: { topic: string; count: number }[];
  reflections: { date: string; text: string }[];
  profile: RelationshipProfile | null;
  memories: RelationshipMemory[];
}

/** 인물별 관계 개요: 대화 횟수, 주제 분포, 관계 요약/변화, 관계 기억 */
export function useRelationships() {
  return useQuery({
    queryKey: queryKeys.relationships,
    queryFn: async (): Promise<RelationshipOverview[]> => {
      const [sessions, profiles, memories] = await Promise.all([
        supabase
          .from('agora_chat_sessions')
          .select('character_id, topic, reflection, started_at')
          .gt('message_count', 0)
          .order('started_at', { ascending: true }),
        supabase.from('agora_relationship_profiles').select('*'),
        supabase
          .from('agora_relationship_memories')
          .select('id, user_id, character_id, content, importance, confidence, created_at, updated_at')
          .order('created_at', { ascending: false }),
      ]);
      if (sessions.error) throw sessions.error;
      if (profiles.error) throw profiles.error;
      if (memories.error) throw memories.error;

      const byCharacter = new Map<string, RelationshipOverview>();
      const get = (characterId: string) => {
        let entry = byCharacter.get(characterId);
        if (!entry) {
          entry = {
            characterId,
            sessionCount: 0,
            firstMetAt: null,
            lastMetAt: null,
            topics: [],
            reflections: [],
            profile: null,
            memories: [],
          };
          byCharacter.set(characterId, entry);
        }
        return entry;
      };

      for (const s of sessions.data) {
        const entry = get(s.character_id);
        entry.sessionCount++;
        entry.firstMetAt ??= s.started_at;
        entry.lastMetAt = s.started_at;
        if (s.topic) {
          const t = entry.topics.find((x) => x.topic === s.topic);
          if (t) t.count++;
          else entry.topics.push({ topic: s.topic, count: 1 });
        }
        if (s.reflection) entry.reflections.unshift({ date: s.started_at, text: s.reflection });
      }
      for (const p of profiles.data as RelationshipProfile[]) {
        get(p.character_id).profile = { ...p, themes: Array.isArray(p.themes) ? p.themes : [] };
      }
      for (const m of memories.data as RelationshipMemory[]) get(m.character_id).memories.push(m);

      for (const entry of byCharacter.values()) entry.topics.sort((a, b) => b.count - a.count);
      return [...byCharacter.values()].sort((a, b) => (b.lastMetAt ?? '').localeCompare(a.lastMetAt ?? ''));
    },
  });
}
