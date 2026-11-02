import { HttpError } from './http.ts';
import { env } from './env.ts';
import { getAdminClient } from './supabase.ts';

function bearer(req: Request): string {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new HttpError(401, 'Missing Authorization header');
  return token;
}

/** 사용자 JWT 를 검증하고 user id 를 반환 */
export async function requireUser(req: Request): Promise<{ id: string; email?: string }> {
  const token = bearer(req);
  const { data, error } = await getAdminClient().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Invalid or expired session');
  return { id: data.user.id, email: data.user.email };
}

/** 관리 작업(문서 임베딩 등)은 Service Role Key 로만 호출 가능 */
export function requireServiceRole(req: Request): void {
  if (bearer(req) !== env.serviceRoleKey()) throw new HttpError(403, 'Service role required');
}
