/** Safety Layer 가 위험 신호를 감지했을 때 대화 위에 고정되는 도움 안내 */
export function SafetyNotice() {
  return (
    <aside
      role="alert"
      className="animate-fade-up rounded-2xl border border-danger/30 bg-danger/[0.06] px-5 py-4 text-sm leading-relaxed text-ink"
    >
      <p className="font-medium">지금 많이 힘드시다면, 혼자 견디지 않으셔도 됩니다.</p>
      <p className="mt-1.5 text-ink-soft">
        자살예방 상담전화 <a className="font-semibold text-ink underline" href="tel:109">109</a> (24시간) · 정신건강
        위기상담 <a className="font-semibold text-ink underline" href="tel:15770199">1577-0199</a> · 긴급 상황은{' '}
        <a className="font-semibold text-ink underline" href="tel:119">119</a> /{' '}
        <a className="font-semibold text-ink underline" href="tel:112">112</a>
      </p>
      <p className="mt-1.5 text-xs text-muted">해외에 계시다면 현지 응급번호나 위기상담 기관에 연락해 주세요.</p>
    </aside>
  );
}
