import { env } from './env.ts';

function resolveOrigin(req: Request): string {
  const allowed = env.allowedOrigins();
  if (allowed.includes('*')) return '*';
  const origin = req.headers.get('origin') ?? '';
  return allowed.includes(origin) ? origin : allowed[0] ?? '';
}

export function corsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(req),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Expose-Headers': 'x-agora-safety',
    Vary: 'Origin',
  };
}

export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  return null;
}
