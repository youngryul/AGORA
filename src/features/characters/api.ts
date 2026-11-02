import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import type { Character } from '@/types/database';

const CHARACTER_COLUMNS =
  'id, code, name, name_en, birth_year, death_year, lifetime_label, description, short_philosophy, tagline, topics, portrait_url, sort_order, is_active, created_at';

async function fetchCharacters(): Promise<Character[]> {
  const { data, error } = await supabase
    .from('agora_characters')
    .select(CHARACTER_COLUMNS)
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data as Character[];
}

export function useCharacters() {
  return useQuery({ queryKey: queryKeys.characters, queryFn: fetchCharacters, staleTime: 10 * 60_000 });
}

/** 목록 캐시를 재사용해 개별 인물을 찾는다 */
export function useCharacter(code: string | undefined) {
  const query = useCharacters();
  return { ...query, data: query.data?.find((c) => c.code === code) };
}

export function useCharacterById(id: string | undefined) {
  const query = useCharacters();
  return { ...query, data: query.data?.find((c) => c.id === id) };
}
