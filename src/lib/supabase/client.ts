import { createClient } from '@supabase/supabase-js';

// 프론트엔드에는 공개 가능한 URL 과 anon(publishable) key 만 존재한다.
// OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY 는 Edge Function Secret 으로만 관리한다.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.warn('[AGORA] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 설정되지 않았습니다. .env.local 을 확인하세요.');
}

export const supabase = createClient(url ?? 'http://localhost:54331', anonKey ?? 'missing-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export const SUPABASE_URL = url ?? 'http://localhost:54331';
export const SUPABASE_ANON_KEY = anonKey ?? '';
