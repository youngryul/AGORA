// Server-Sent Events 응답 헬퍼
//
// 이벤트 형식 (모두 `data: <json>\n\n`):
//   { type: 'meta',  safety, memoriesUsed, knowledge }   — 생성 시작 전 컨텍스트 정보
//   { type: 'delta', text }                              — 토큰 조각
//   { type: 'done',  messageId }                         — 저장 완료
//   { type: 'error', message }

import { corsHeaders } from './cors.ts';

export type StreamEvent =
  | { type: 'meta'; safety: string; memoriesUsed: number; knowledge: { title: string; verbatim: boolean }[] }
  | { type: 'delta'; text: string }
  | { type: 'done'; messageId: string | null }
  | { type: 'error'; message: string };

export interface SSEWriter {
  send(event: StreamEvent): void;
  close(): void;
  /** 클라이언트가 연결을 끊었는지 */
  readonly closed: boolean;
}

/**
 * producer 는 클라이언트 연결이 끊겨도 끝까지 실행된다.
 * (응답 생성이 끝나야 Assistant Message 를 저장할 수 있기 때문)
 */
export function sseResponse(
  req: Request,
  producer: (writer: SSEWriter) => Promise<void>,
  extraHeaders: Record<string, string> = {},
): { response: Response; done: Promise<void> } {
  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
    cancel() {
      closed = true;
    },
  });

  const writer: SSEWriter = {
    send(event) {
      if (closed || !controllerRef) return;
      try {
        controllerRef.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      } catch {
        closed = true;
      }
    },
    close() {
      if (closed || !controllerRef) return;
      closed = true;
      try {
        controllerRef.close();
      } catch {
        // already closed
      }
    },
    get closed() {
      return closed;
    },
  };

  const done = producer(writer)
    .catch((error) => {
      console.error('[sse]', error);
      writer.send({ type: 'error', message: '응답을 생성하는 중 문제가 발생했습니다.' });
    })
    .finally(() => writer.close());

  const response = new Response(stream, {
    headers: {
      ...corsHeaders(req),
      ...extraHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });

  return { response, done };
}
