// POST /functions/v1/consolidate-memory
// 현재 사용자의 유사한 Long-term Memory 들을 상위 개념의 Semantic Memory 로 통합한다.

import { handlePreflight } from '../_shared/cors.ts';
import { errorResponse, HttpError, json } from '../_shared/http.ts';
import { requireUser } from '../_shared/auth.ts';
import { getAdminClient } from '../_shared/supabase.ts';
import { consolidateUserMemories } from '../_shared/memory/consolidation.ts';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const user = await requireUser(req);
    const result = await consolidateUserMemories(getAdminClient(), user.id);
    return json(req, result);
  } catch (error) {
    return errorResponse(req, error);
  }
});
