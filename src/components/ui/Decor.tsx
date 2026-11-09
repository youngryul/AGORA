import { cn } from '@/lib/utils';

/** 섬 분위기를 만드는 작은 장식들 (모두 aria-hidden) */

export function Leaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('h-6 w-6', className)} aria-hidden>
      <path d="M24 44C10 40 6 24 13 9c12 2 25 11 25 23 0 7-5 11-14 12Z" fill="var(--accent)" />
      <path d="M24 44c-2-11-5-22-11-33" stroke="var(--card)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M20 30l-6-3M22 22l5-3" stroke="var(--card)" strokeWidth="2" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

export function Cloud({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 50" className={cn('w-28', className)} aria-hidden>
      <path
        d="M22 46a16 16 0 0 1-2-32 20 20 0 0 1 37-6 17 17 0 0 1 29 8 15 15 0 0 1 14 30Z"
        fill="var(--cloud)"
      />
    </svg>
  );
}

export function Flower({ className, color = 'var(--blossom)' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-5 w-5', className)} aria-hidden>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="16" cy="9" rx="5" ry="6.5" fill={color} transform={`rotate(${r} 16 16)`} />
      ))}
      <circle cx="16" cy="16" r="4" fill="var(--gold)" />
    </svg>
  );
}

/** 말풍선 끝에서 깜빡이는 ▼ — 다음 대사를 기다리는 표시 */
export function NextCaret({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={cn('animate-bob h-3 w-4', className)} aria-hidden>
      <path d="M2 2h16L10 12Z" fill="var(--gold)" stroke="var(--gold-edge)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** 잔디 언덕 — 섹션 경계 */
export function GrassWave({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className={cn('block h-10 w-full', className)} aria-hidden>
      <path
        d="M0 30c120-26 240-26 360 0s240 26 360 0 240-26 360 0 240 26 360 0v30H0Z"
        fill="var(--leaf)"
      />
      <path
        d="M0 42c120-20 240-20 360 0s240 20 360 0 240-20 360 0 240 20 360 0v18H0Z"
        fill="var(--accent)"
      />
    </svg>
  );
}
