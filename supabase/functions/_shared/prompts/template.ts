// 아주 작은 템플릿 엔진: {{name}} 치환 + 빈 섹션 정리
// Prompt 문구는 prompts/*.ts 의 템플릿 상수로만 관리하고, 함수 코드에는 문자열을 직접 쓰지 않는다.

export function render(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
      const value = vars[key];
      return value === null || value === undefined ? '' : String(value);
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function bulletList(items: readonly string[] | undefined, prefix = '- '): string {
  if (!items || items.length === 0) return '';
  return items.map((item) => `${prefix}${item}`).join('\n');
}

/** 제목 + 본문으로 섹션을 만들고, 본문이 비어 있으면 섹션 자체를 생략 */
export function section(title: string, body: string): string {
  const trimmed = body.trim();
  return trimmed ? `## ${title}\n${trimmed}` : '';
}

export function joinSections(sections: string[]): string {
  return sections.filter((s) => s.trim() !== '').join('\n\n');
}
