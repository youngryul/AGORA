// Edge Function 환경 변수 접근 (Secret 은 모두 여기서만 읽는다)

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function optionalEnv(name: string, fallback = ''): string {
  const value = Deno.env.get(name);
  return value && value.trim() !== '' ? value : fallback;
}

export const env = {
  supabaseUrl: () => requireEnv('SUPABASE_URL'),
  serviceRoleKey: () => requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  allowedOrigins: () =>
    optionalEnv('ALLOWED_ORIGINS', '*')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
};
