import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="불러오는 중"
      className={cn('inline-block h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-gold', className)}
    />
  );
}

export function PageLoader({ label = '서재의 불을 켜는 중…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-muted">
      <Spinner />
      <p className="font-display text-sm">{label}</p>
    </div>
  );
}
