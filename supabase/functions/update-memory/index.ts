// POST /functions/v1/update-memory
// body: { memory_id: string, content: string, importance?: number, kind?: 'user' | 'relationship' }
//
// 사용자가 Memory 내용을 직접 수정하면 의미가 바뀌므로 임베딩도 다시 계산해야 한다.
// (클라이언트에서 content 만 바꾸면 검색 벡터와 내용이 어긋난다)

import { handlePreflight } from '../_shared/cors.ts';
import { errorResponse, HttpError, json, readJson } from '../_shared/http.ts';
import { requireUser } from '../_shared/auth.ts';
import { getAdminClient } from '../_shared/supabase.ts';
import { reembedText } from '../_shared/memory/extraction.ts';

interface UpdateMemoryRequest {
  memory_id?: string;
  content?: string;
  importance?: number;
  kind?: 'user' | 'relationship';
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const user = await requireUser(req);
    const body = await readJson<UpdateMemoryRequest>(req);
    const content = body.content?.trim() ?? '';
    if (!body.memory_id) throw new HttpError(400, 'memory_id is required');
    if (content.length < 2 || content.length > 300) throw new HttpError(400, '기억은 2~300자로 입력해 주세요.');

    const table = body.kind === 'relationship' ? 'agora_relationship_memories' : 'agora_user_memories';
    const db = getAdminClient();

    const patch: Record<string, unknown> = {
      content,
      embedding: await reembedText(content),
      confidence: 1, // 사용자가 직접 확인/수정한 기억
    };
    if (typeof body.importance === 'number') patch.importance = Math.min(1, Math.max(0, body.importance));

    const { data, error } = await db
      .from(table)
      .update(patch)
      .eq('id', body.memory_id)
      .eq('user_id', user.id)
      .select('id, content, importance, confidence, updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, 'Memory not found');

    return json(req, data);
  } catch (error) {
    return errorResponse(req, error);
  }
});
