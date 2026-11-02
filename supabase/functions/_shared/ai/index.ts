import { optionalEnv, requireEnv } from '../env.ts';
import { OpenAICompatibleEmbedding, OpenAICompatibleLLM } from './openai-compatible.ts';
import type { EmbeddingProvider, LLMProvider } from './types.ts';

export type { ChatMessage, EmbeddingProvider, LLMProvider } from './types.ts';

/**
 * Provider 팩토리.
 *  AI_PROVIDER=openai (기본)      → OpenAI
 *  AI_PROVIDER=openai-compatible  → AI_BASE_URL 의 호환 API
 * 다른 SDK 기반 Provider 가 필요하면 types.ts 인터페이스를 구현해 여기에 case 를 추가한다.
 * Embedding Provider 는 AI_EMBEDDING_* 로 Chat Provider 와 독립적으로 바꿀 수 있다.
 */
function apiKey(): string {
  return optionalEnv('AI_API_KEY') || requireEnv('OPENAI_API_KEY');
}

function baseUrl(): string {
  return optionalEnv('AI_BASE_URL', 'https://api.openai.com/v1').replace(/\/$/, '');
}

export function chatModel(): string {
  return optionalEnv('AI_CHAT_MODEL', 'gpt-4o-mini');
}

/** 메모리 추출 / 통합 / 회고 같은 내부 분석 작업용 모델 */
export function memoryModel(): string {
  return optionalEnv('AI_MEMORY_MODEL') || chatModel();
}

let llm: LLMProvider | null = null;
let embedder: EmbeddingProvider | null = null;

export function getLLM(): LLMProvider {
  if (llm) return llm;
  const provider = optionalEnv('AI_PROVIDER', 'openai');
  switch (provider) {
    case 'openai':
    case 'openai-compatible':
      llm = new OpenAICompatibleLLM({ apiKey: apiKey(), baseUrl: baseUrl(), chatModel: chatModel() });
      return llm;
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }
}

export function getEmbedder(): EmbeddingProvider {
  if (embedder) return embedder;
  const provider = optionalEnv('AI_EMBEDDING_PROVIDER', optionalEnv('AI_PROVIDER', 'openai'));
  const dimensions = Number(optionalEnv('AI_EMBEDDING_DIMENSIONS', '1536'));
  switch (provider) {
    case 'openai':
    case 'openai-compatible':
      embedder = new OpenAICompatibleEmbedding(
        {
          apiKey: optionalEnv('AI_EMBEDDING_API_KEY') || apiKey(),
          baseUrl: (optionalEnv('AI_EMBEDDING_BASE_URL') || baseUrl()).replace(/\/$/, ''),
          model: optionalEnv('AI_EMBEDDING_MODEL', 'text-embedding-3-small'),
        },
        dimensions,
      );
      return embedder;
    default:
      throw new Error(`Unsupported AI_EMBEDDING_PROVIDER: ${provider}`);
  }
}

export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await getEmbedder().embed([text]);
  return vector;
}
