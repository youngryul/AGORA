// POST /functions/v1/extract-memory
// body: { session_id: string }
// 대화를 분석해 중요한 Long-term Memory / Relationship Memory 를 추출하고 저장한다.
// (memory_enabled = false 인 사용자는 저장하지 않는다)

import { handlePreflight } from '../_shared/cors.ts';
import { errorResponse, HttpError, json, readJson } from '../_shared/http.ts';
import { requireUser } from '../_shared/auth.ts';
import { getAdminClient } from '../_shared/supabase.ts';
import { extractAndStoreMemories } from '../_shared/memory/extraction.ts';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const user = await requireUser(req);
    const { session_id } = await readJson<{ session_id?: string }>(req);
    if (!session_id) throw new HttpError(400, 'session_id is required');

    const result = await extractAndStoreMemories(getAdminClient(), { userId: user.id, sessionId: session_id });
    return json(req, result);
  } catch (error) {
    return errorResponse(req, error);
  }
});
