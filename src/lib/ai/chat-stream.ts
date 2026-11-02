// Chat SSE 클라이언트.
// React 는 AI API 를 직접 호출하지 않는다. Supabase Edge Function(chat)의 SSE 스트림만 읽는다.
// (Prompt 조립은 서버의 supabase/functions/_shared/ai/prompt-builder.ts 에서 수행)

import { invokeStream } from '@/lib/supabase/functions';

export type SafetyLevel = 'none' | 'elevated' | 'crisis';

export type ChatStreamEvent =
  | { type: 'meta'; safety: SafetyLevel; memoriesUsed: number; knowledge: { title: string; verbatim: boolean }[] }
  | { type: 'delta'; text: string }
  | { type: 'done'; messageId: string | null }
  | { type: 'error'; message: string };

export interface ChatStreamRequest {
  sessionId: string;
  message?: string;
  kickoff?: boolean;
  signal?: AbortSignal;
}

export async function* streamChat(req: ChatStreamRequest): AsyncGenerator<ChatStreamEvent> {
  const res = await invokeStream(
    'chat',
    { session_id: req.sessionId, message: req.message, kickoff: req.kickoff },
    req.signal,
  );
  if (!res.body) throw new Error('스트림을 열 수 없습니다.');

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n');
        if (data) {
          try {
            yield JSON.parse(data) as ChatStreamEvent;
          } catch {
            // 손상된 프레임은 무시
          }
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    reader.releaseLock();
  }
}
