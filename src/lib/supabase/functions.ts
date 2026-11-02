import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from './client';

export class FunctionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function functionUrl(name: string): string {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

/** 현재 로그인 사용자의 JWT 로 Edge Function 을 호출하기 위한 헤더 */
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new FunctionError(401, '로그인이 필요합니다.');
  return {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
}

async function errorFrom(res: Response): Promise<FunctionError> {
  let message = `요청에 실패했습니다 (${res.status})`;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {
    // ignore
  }
  return new FunctionError(res.status, message);
}

/** JSON 응답 Edge Function 호출 */
export async function invokeFunction<T>(name: string, body: unknown): Promise<T> {
  const res = await fetch(functionUrl(name), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()) as T;
}

/** Streaming Edge Function 호출 (Response 를 그대로 반환) */
export async function invokeStream(name: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(functionUrl(name), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw await errorFrom(res);
  return res;
}
