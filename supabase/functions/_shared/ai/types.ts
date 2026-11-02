// Provider 독립적인 AI 인터페이스.
// 새 Provider 는 이 인터페이스만 구현하고 ./index.ts 의 팩토리에 등록하면 된다.

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface LLMProvider {
  readonly name: string;
  /** 단일 응답 */
  complete(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  /** JSON 객체 응답 (provider 가 지원하면 JSON mode 사용) */
  completeJSON<T>(messages: ChatMessage[], options?: ChatOptions): Promise<T>;
  /** 토큰 스트리밍 */
  stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
