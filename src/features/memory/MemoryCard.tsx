import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { cn } from '@/lib/utils';

interface MemoryCardProps {
  content: string;
  meta: string[];
  importance: number;
  onSave: (content: string) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}

export function MemoryCard({ content, meta, importance, onSave, onDelete }: MemoryCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: 'save' | 'delete', task: () => Promise<unknown>) => {
    setBusy(kind);
    setError(null);
    try {
      await task();
      if (kind === 'save') setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="group relative rounded-2xl border border-line bg-card px-6 py-5 transition hover:border-line-strong">
      <span
        aria-hidden
        className={cn('absolute top-6 left-0 h-6 w-[3px] rounded-r-full', importance >= 0.75 ? 'bg-gold' : 'bg-line-strong')}
      />
      {editing ? (
        <div className="space-y-3">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={300} autoFocus />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(content);
                setEditing(false);
              }}
            >
              취소
            </Button>
            <Button
              size="sm"
              loading={busy === 'save'}
              disabled={draft.trim().length < 2 || draft.trim() === content}
              onClick={() => run('save', () => onSave(draft.trim()))}
            >
              저장
            </Button>
          </div>
        </div>
      ) : (
        <p className="font-display text-[16px] leading-relaxed text-ink">{content}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">{meta.filter(Boolean).join(' · ')}</p>
        {!editing && (
          <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              수정
            </Button>
            <Button size="sm" variant="ghost" loading={busy === 'delete'} onClick={() => run('delete', onDelete)}>
              삭제
            </Button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </article>
  );
}

