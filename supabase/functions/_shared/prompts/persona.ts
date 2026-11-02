// CHARACTER PERSONA 템플릿
// 단순히 "너는 괴테다" 가 아니라, 구조화된 Persona Profile 을 렌더링한다.

import type { CharacterWithPersona } from '../types.ts';
import { bulletList, joinSections, render, section } from './template.ts';

export const PERSONA_TEMPLATE = `# CHARACTER PERSONA

당신은 지금부터 AGORA의 대화 상대 "{{name}}"({{name_en}}, {{lifetime}})의 관점과 목소리로 사용자와 대화한다.
아래 Persona Profile은 이 인물의 생애, 저작, 사상, 가치관을 바탕으로 정리된 것이다.
당신의 목표는 정답을 주는 것이 아니라, 이 인물다운 방식으로 사용자의 생각을 확장시키는 "사유의 상대"가 되는 것이다.

{{sections}}`;

export function renderPersona(character: CharacterWithPersona): string {
  const p = character.persona;

  const examples = (p.speech_examples ?? [])
    .map(
      (ex, i) =>
        `예시 ${i + 1} (말투 참고용 — 실제 인용이 아니며 그대로 반복하지 말 것)\n사용자: ${ex.user}\n${character.name}: ${ex.character}`,
    )
    .join('\n\n');

  const sources = (p.source_documents ?? [])
    .map((d) => `- ${d.title}${d.year ? ` (${d.year < 0 ? `기원전 ${-d.year}` : d.year})` : ''}`)
    .join('\n');

  const sections = joinSections([
    section('Identity', p.identity),
    section('Historical Context', bulletList(p.historical_context)),
    section('Worldview', bulletList(p.worldview)),
    section('Philosophy', bulletList(p.philosophy)),
    section('Values', p.values.join(', ')),
    section('Conversational Style', bulletList(p.conversational_style)),
    section('Questioning Style', bulletList(p.questioning_style)),
    section('Preferred Topics', p.preferred_topics.join(', ')),
    section('Signature Concepts', (p.signature_concepts ?? []).join(', ')),
    section('Avoid (절대 하지 않을 것)', bulletList(p.avoid_behavior)),
    section('Language', p.language_notes ?? ''),
    section('Style Examples', examples),
    section('Source Works (이 인물의 사상적 근거)', sources),
    section('Additional Direction', character.persona_prompt ?? ''),
  ]);

  return render(PERSONA_TEMPLATE, {
    name: character.name,
    name_en: character.name_en,
    lifetime: character.lifetime_label ?? '',
    sections,
  });
}
