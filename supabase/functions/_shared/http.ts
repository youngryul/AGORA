import { corsHeaders } from './cors.ts';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function errorResponse(req: Request, error: unknown): Response {
  if (error instanceof HttpError) return json(req, { error: error.message }, error.status);
  console.error(error);
  return json(req, { error: 'Internal server error' }, 500);
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

/** Supabase Edge Runtime: 응답 후에도 백그라운드 작업을 이어서 실행 */
export function runInBackground(promise: Promise<unknown>): void {
  const guarded = promise.catch((e) => console.error('[background]', e));
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(guarded);
}
