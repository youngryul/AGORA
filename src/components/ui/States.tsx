import type { ReactNode } from 'react';
import { Button } from './Button';
import { Leaf } from './Decor';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="speech mx-auto max-w-md px-8 py-9 text-center">
      <p className="font-display text-3xl" aria-hidden>
        앗!
      </p>
      <p className="mt-3 text-ink-soft">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-6" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Leaf className="animate-sway mx-auto mb-5 h-12 w-12" />
      <p className="font-display text-2xl text-ink">{title}</p>
      {body && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{body}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
