// POST /functions/v1/chat
//
// body: { session_id: string, message?: string, kickoff?: boolean }
//   - message 가 있으면 사용자 메시지에 대한 응답
//   - kickoff: true 이고 세션에 메시지가 없으면 인물이 먼저 말을 건넨다
//
// 1. 사용자 인증 → 2. 사용자 메시지 저장 → 3~6. Recent / Memory / Relationship / RAG 검색
// 7. Prompt 조립 → 8. LLM 호출 → 9. SSE Streaming → 10. Assistant Message 저장
// (+ 메시지가 충분히 쌓였으면 백그라운드에서 Memory Extraction)

import { handlePreflight } from '../_shared/cors.ts';
import { errorResponse, HttpError, readJson, runInBackground } from '../_shared/http.ts';
import { requireUser } from '../_shared/auth.ts';
import { getAdminClient } from '../_shared/supabase.ts';
import { getLLM } from '../_shared/ai/index.ts';
import { buildChatMessages, type PromptMode } from '../_shared/ai/prompt-builder.ts';
import { gatherContext } from '../_shared/conversation/context.ts';
import { loadCharacterWithPersona, loadSessionForUser, saveMessage } from '../_shared/conversation/repository.ts';
import { markMemoriesAccessed } from '../_shared/memory/retrieval.ts';
import { extractAndStoreMemories } from '../_shared/memory/extraction.ts';
import { memoryConfig } from '../_shared/memory/config.ts';
import { sseResponse } from '../_shared/sse.ts';

const MAX_MESSAGE_LENGTH = 4000;

interface ChatRequest {
  session_id?: string;
  message?: string;
  kickoff?: boolean;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const user = await requireUser(req);
    const body = await readJson<ChatRequest>(req);

    if (!body.session_id) throw new HttpError(400, 'session_id is required');
    const message = body.message?.trim() ?? '';
    if (!message && !body.kickoff) throw new HttpError(400, 'message is required');
    if (message.length > MAX_MESSAGE_LENGTH) throw new HttpError(400, `메시지는 ${MAX_MESSAGE_LENGTH}자 이내로 입력해 주세요.`);

    const db = getAdminClient();
    const session = await loadSessionForUser(db, body.session_id, user.id);
    if (session.ended_at) throw new HttpError(409, '이미 종료된 대화입니다.');

    const mode: PromptMode = message ? 'reply' : 'kickoff';
    if (mode === 'kickoff' && session.message_count > 0) throw new HttpError(409, 'Conversation already started');

    const character = await loadCharacterWithPersona(db, session.character_id);

    // 2. 사용자 메시지 저장 (응답 생성이 실패해도 사용자의 말은 남는다)
    if (message) {
      await saveMessage(db, { sessionId: session.id, userId: user.id, role: 'user', content: message });
    }

    // 3~6. 컨텍스트 수집
    const context = await gatherContext(db, {
      mode,
      userId: user.id,
      session,
      character,
      currentMessage: message || null,
    });

    // 7. Prompt 조립
    const messages = buildChatMessages(context.prompt);
    const safety = context.prompt.risk.level;

    // 8~10. Streaming + 저장
    const { response, done } = sseResponse(
      req,
      async (writer) => {
        writer.send({
          type: 'meta',
          safety,
          memoriesUsed: context.usedMemoryIds.length + context.usedRelationshipIds.length,
          knowledge: context.knowledgeSources.map(({ title, verbatim }) => ({ title, verbatim })),
        });

        let full = '';
        for await (const delta of getLLM().stream(messages, { temperature: safety === 'crisis' ? 0.4 : 0.85 })) {
          full += delta;
          writer.send({ type: 'delta', text: delta });
        }
        full = full.trim();
        if (!full) throw new Error('Empty completion');

        const messageId = await saveMessage(db, {
          sessionId: session.id,
          userId: user.id,
          role: 'assistant',
          content: full,
          metadata: {
            mode,
            safety,
            memory_ids: context.usedMemoryIds,
            relationship_memory_ids: context.usedRelationshipIds,
            knowledge: context.knowledgeSources,
          },
        });
        writer.send({ type: 'done', messageId });

        await markMemoriesAccessed(db, context.usedMemoryIds, context.usedRelationshipIds);

        // 대화 도중 주기적 Memory Extraction
        const messageCount = session.message_count + (message ? 2 : 1);
        if (
          context.memoryEnabled &&
          messageCount - session.memory_extracted_count >= memoryConfig.extractEveryMessages
        ) {
          await extractAndStoreMemories(db, { userId: user.id, sessionId: session.id });
        }
      },
      { 'x-agora-safety': safety },
    );

    // 클라이언트 연결이 끊겨도 생성/저장이 끝까지 진행되도록
    runInBackground(done);
    return response;
  } catch (error) {
    return errorResponse(req, error);
  }
});
