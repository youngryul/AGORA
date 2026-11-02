import type { ReactNode } from 'react';
import { Button } from './Button';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-card p-8 text-center">
      <p className="text-ink-soft">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-6 h-px w-12 bg-gold/50" />
      <p className="font-display text-xl text-ink">{title}</p>
      {body && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
