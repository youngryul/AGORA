import { cn } from '@/lib/utils';
import { Leaf } from './Decor';

export function Spinner({ className }: { className?: string }) {
  return (
    <span role="status" aria-label="불러오는 중" className={cn('inline-flex items-center gap-1.5', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-hop h-2.5 w-2.5 rounded-full bg-accent"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

export function PageLoader({ label = '섬으로 가는 배를 기다리는 중…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-muted">
      <Leaf className="animate-sway h-10 w-10" />
      <Spinner />
      <p className="font-display text-[15px]">{label}</p>
    </div>
  );
}
