import type { ChatMessage, ChatOptions, EmbeddingProvider, LLMProvider } from './types.ts';

/**
 * OpenAI Chat Completions / Embeddings 호환 Provider.
 * baseUrl 만 바꾸면 OpenAI 호환 API(Together, Groq, vLLM, Ollama 등)에 그대로 사용할 수 있다.
 */
interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  chatModel: string;
}

export class OpenAICompatibleLLM implements LLMProvider {
  readonly name = 'openai-compatible';
  constructor(private config: LLMConfig) {}

  private async request(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 500)}`);
    }
    return res;
  }

  private baseBody(messages: ChatMessage[], options: ChatOptions) {
    return {
      model: options.model ?? this.config.chatModel,
      messages,
      temperature: options.temperature ?? 0.8,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    };
  }

  async complete(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const res = await this.request(this.baseBody(messages, options), options.signal);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  async completeJSON<T>(messages: ChatMessage[], options: ChatOptions = {}): Promise<T> {
    const res = await this.request(
      {
        ...this.baseBody(messages, { temperature: 0.2, ...options }),
        response_format: { type: 'json_object' },
      },
      options.signal,
    );
    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '{}';
    return parseJsonLoose<T>(content);
  }

  async *stream(messages: ChatMessage[], options: ChatOptions = {}): AsyncIterable<string> {
    const res = await this.request({ ...this.baseBody(messages, options), stream: true }, options.signal);
    if (!res.body) throw new Error('LLM stream has no body');

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
          if (delta) yield delta as string;
        } catch {
          // keep-alive 나 불완전한 라인은 무시
        }
      }
    }
  }
}

interface EmbeddingConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class OpenAICompatibleEmbedding implements EmbeddingProvider {
  readonly name = 'openai-compatible';
  constructor(private config: EmbeddingConfig, readonly dimensions: number) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const supportsDimensions = this.config.model.startsWith('text-embedding-3');
    const res = await fetch(`${this.config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        input: texts.map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 8000)),
        ...(supportsDimensions ? { dimensions: this.dimensions } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Embedding request failed (${res.status}): ${text.slice(0, 500)}`);
    }
    const data = await res.json();
    const vectors = (data.data as { index: number; embedding: number[] }[])
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
    for (const v of vectors) {
      if (v.length !== this.dimensions) {
        throw new Error(
          `Embedding dimension mismatch: got ${v.length}, expected ${this.dimensions}. ` +
            'DB 스키마의 vector(N)과 AI_EMBEDDING_DIMENSIONS 를 맞추세요.',
        );
      }
    }
    return vectors;
  }
}

/** ```json 펜스나 앞뒤 설명이 섞여도 첫 JSON 객체를 파싱 */
export function parseJsonLoose<T>(content: string): T {
  const cleaned = content.replace(/```(?:json)?/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new Error(`LLM did not return valid JSON: ${content.slice(0, 200)}`);
  }
}
