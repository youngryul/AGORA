import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { env } from './env.ts';

export type AdminClient = SupabaseClient;

let admin: SupabaseClient | null = null;

/**
 * Service Role 클라이언트. RLS 를 우회하므로 모든 쿼리에 user_id 필터를 명시해야 한다.
 * 이 클라이언트는 Edge Function 안에서만 생성된다 (프론트엔드에는 존재하지 않음).
 */
export function getAdminClient(): SupabaseClient {
  if (!admin) {
    admin = createClient(env.supabaseUrl(), env.serviceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
