// POST /functions/v1/generate-reflection
// body: { session_id: string }
//
// 대화 종료:
//  1) 인물이 오늘의 대화를 한 문장으로 정리 (reflection)
//  2) chat_sessions.reflection / ended_at 저장
//  3) 백그라운드에서 Memory Extraction 실행

import { handlePreflight } from '../_shared/cors.ts';
import { errorResponse, HttpError, json, readJson, runInBackground } from '../_shared/http.ts';
import { requireUser } from '../_shared/auth.ts';
import { getAdminClient } from '../_shared/supabase.ts';
import { getLLM } from '../_shared/ai/index.ts';
import { buildChatMessages } from '../_shared/ai/prompt-builder.ts';
import { gatherContext } from '../_shared/conversation/context.ts';
import { loadCharacterWithPersona, loadSessionForUser } from '../_shared/conversation/repository.ts';
import { extractAndStoreMemories } from '../_shared/memory/extraction.ts';
import { REFLECTION_SAFETY_FALLBACK } from '../_shared/prompts/reflection.ts';

function cleanReflection(text: string): string {
  return text
    .replace(/^["'“”‘’「」『』\s]+|["'“”‘’「」『』\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const user = await requireUser(req);
    const { session_id } = await readJson<{ session_id?: string }>(req);
    if (!session_id) throw new HttpError(400, 'session_id is required');

    const db = getAdminClient();
    const session = await loadSessionForUser(db, session_id, user.id);
    if (session.ended_at) return json(req, { reflection: session.reflection, ended_at: session.ended_at });

    const { count: userMessageCount } = await db
      .from('agora_chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session.id)
      .eq('role', 'user');

    let reflection: string | null = null;
    if ((userMessageCount ?? 0) > 0) {
      const character = await loadCharacterWithPersona(db, session.character_id);
      const context = await gatherContext(db, {
        mode: 'reflection',
        userId: user.id,
        session,
        character,
        currentMessage: null,
      });
      if (context.prompt.risk.level !== 'none') {
        // 위험 신호가 있었던 대화는 철학적 경구로 마무리하지 않는다
        reflection = REFLECTION_SAFETY_FALLBACK;
      } else {
        const raw = await getLLM().complete(buildChatMessages(context.prompt), { temperature: 0.7, maxTokens: 200 });
        reflection = cleanReflection(raw) || null;
      }
    }

    const endedAt = new Date().toISOString();
    const { error } = await db
      .from('agora_chat_sessions')
      .update({ reflection, ended_at: endedAt })
      .eq('id', session.id)
      .eq('user_id', user.id);
    if (error) throw error;

    if ((userMessageCount ?? 0) > 0) {
      runInBackground(extractAndStoreMemories(db, { userId: user.id, sessionId: session.id }));
    }

    return json(req, { reflection, ended_at: endedAt });
  } catch (error) {
    return errorResponse(req, error);
  }
});
