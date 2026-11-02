// deno test supabase/functions/tests  (네트워크/DB 없이 실행되는 순수 모듈 테스트)

import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { assessRisk } from '../_shared/safety/risk-detector.ts';
import { chunkText } from '../_shared/rag/chunker.ts';
import { buildChatMessages, type PromptInput, trimHistory } from '../_shared/ai/prompt-builder.ts';
import { parseJsonLoose } from '../_shared/ai/openai-compatible.ts';
import type { CharacterWithPersona } from '../_shared/types.ts';

const goethe: CharacterWithPersona = {
  id: 'c1',
  code: 'goethe',
  name: '괴테',
  name_en: 'Johann Wolfgang von Goethe',
  lifetime_label: '1749 – 1832',
  short_philosophy: '삶, 사랑, 욕망 그리고 성장',
  persona_prompt: null,
  persona: {
    identity: '요한 볼프강 폰 괴테',
    historical_context: ['바이마르의 행정가'],
    worldview: ['인간은 경험을 통해 성장한다'],
    philosophy: ['활동이 우울을 이긴다'],
    values: ['성장', '사랑'],
    conversational_style: ['질문을 던진다'],
    questioning_style: ['처음의 마음을 묻는다'],
    preferred_topics: ['사랑'],
    avoid_behavior: ['상담사처럼 말하지 않는다'],
    source_documents: [{ title: '파우스트', year: 1808 }],
  },
};

function input(overrides: Partial<PromptInput> = {}): PromptInput {
  return {
    mode: 'reply',
    character: goethe,
    nickname: '영률',
    profile: { summary: '직업의 의미를 고민 중', values: ['인정'], goals: [], preferences: [] },
    memories: [
      {
        id: 'm1',
        character_id: null,
        memory_type: 'semantic',
        content: '노력이 인정받는 것을 중요하게 여긴다.',
        importance: 0.8,
        confidence: 0.9,
        created_at: '2026-10-01T00:00:00Z',
        similarity: 0.7,
        score: 0.7,
      },
    ],
    relationship: { profile: null, memories: [], sessionCount: 3, firstMetAt: '2026-09-01T00:00:00Z' },
    knowledge: [
      {
        chunk_id: 'k1',
        document_id: 'd1',
        content: '천상의 서곡',
        metadata: { verbatim: true, original_text: 'Es irrt der Mensch, solang er strebt.', source_location: 'v. 317' },
        title: '파우스트 – 방황',
        source: 'Faust I',
        source_type: 'primary_text',
        author: 'Goethe',
        published_year: 1808,
        similarity: 0.6,
      },
      {
        chunk_id: 'k2',
        document_id: 'd2',
        content: '요약',
        metadata: { verbatim: false },
        title: '생애',
        source: 'AGORA',
        source_type: 'biography',
        author: 'AGORA',
        published_year: null,
        similarity: 0.5,
      },
    ],
    topic: '일 때문에 힘들어요',
    today: '2026-10-06',
    history: [
      { role: 'user', content: '안녕하세요' },
      { role: 'assistant', content: '어서 오십시오.' },
    ],
    currentMessage: '회사에서 인정받지 못하는 것 같아요.',
    risk: { level: 'none', matched: [] },
    ...overrides,
  };
}

Deno.test('risk detector: crisis expressions', () => {
  assertEquals(assessRisk('요즘 정말 죽고 싶어요').level, 'crisis');
  assertEquals(assessRisk('자해하고 싶은 생각이 들어요').level, 'crisis');
  assertEquals(assessRisk('삶을 끝내고 싶다').level, 'crisis');
  assertEquals(assessRisk('I want to kill myself').level, 'crisis');
});

Deno.test('risk detector: elevated and none', () => {
  assertEquals(assessRisk('그냥 사라지고 싶어요').level, 'elevated');
  assertEquals(assessRisk('오늘 날씨가 좋네요').level, 'none');
  assertEquals(assessRisk('배고파 죽을 것 같아요').level, 'none');
  // 직전 메시지에 위기 신호가 있으면 Safety Mode 유지
  assertEquals(assessRisk('모르겠어요', ['죽고 싶어요']).level, 'elevated');
});

Deno.test('chunker keeps short text and splits long text with bounded size', () => {
  assertEquals(chunkText('짧은 문서').length, 1);
  const long = Array.from({ length: 40 }, (_, i) => `문장 ${i}입니다. 이것은 꽤 긴 문단의 일부입니다.`).join(' ');
  const chunks = chunkText(`${long}\n\n${long}`, { maxChars: 300, overlapChars: 50 });
  assert(chunks.length > 2);
  for (const c of chunks) assert(c.length <= 300 + 60, `chunk too long: ${c.length}`);
});

Deno.test('prompt builder assembles layers in order', () => {
  const messages = buildChatMessages(input());
  const system = messages[0].content;
  const order = ['# SAFETY POLICY', '# CHARACTER PERSONA', '# QUOTATION POLICY', '# CURRENT USER PROFILE', '# RELEVANT LONG-TERM MEMORY', '# RELATIONSHIP MEMORY', '# CHARACTER KNOWLEDGE', '# THIS CONVERSATION'];
  let last = -1;
  for (const marker of order) {
    const idx = system.indexOf(marker);
    assert(idx > last, `${marker} out of order`);
    last = idx;
  }
  assertStringIncludes(system, '[VERBATIM]');
  assertStringIncludes(system, '[요약·해석 — 인용 불가]');
  assertStringIncludes(system, '[공통 · 특성 · 2026-10-01]');
  assertEquals(messages.at(-1), { role: 'user', content: '회사에서 인정받지 못하는 것 같아요.' });
  assertEquals(messages.length, 4);
});

Deno.test('prompt builder injects crisis override right before user message', () => {
  const messages = buildChatMessages(input({ risk: { level: 'crisis', matched: ['죽고 싶'] }, currentMessage: '죽고 싶어요' }));
  const override = messages.at(-2)!;
  assertEquals(override.role, 'system');
  assertStringIncludes(override.content, 'SAFETY MODE ACTIVE');
  assertStringIncludes(override.content, '109');
});

Deno.test('prompt builder omits memory sections when memory is off', () => {
  const system = buildChatMessages(input({ memories: [], relationship: null, profile: null, nickname: null }))[0].content;
  assert(!system.includes('RELEVANT LONG-TERM MEMORY'));
  assert(!system.includes('RELATIONSHIP MEMORY'));
  assert(!system.includes('CURRENT USER PROFILE'));
});

Deno.test('trimHistory keeps most recent messages within budget', () => {
  const history = Array.from({ length: 10 }, (_, i) => ({ role: 'user' as const, content: `${i}`.repeat(100) }));
  const trimmed = trimHistory(history, 350);
  assertEquals(trimmed.length, 3);
  assertEquals(trimmed.at(-1)!.content[0], '9');
});

Deno.test('parseJsonLoose handles fenced output', () => {
  assertEquals(parseJsonLoose<{ a: number }>('```json\n{"a":1}\n```'), { a: 1 });
  assertEquals(parseJsonLoose<{ a: number }>('결과: {"a":2} 끝'), { a: 2 });
});
