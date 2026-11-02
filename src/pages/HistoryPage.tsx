import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useSessionHistory } from '@/features/history/api';
import { useCharacters } from '@/features/characters/api';
import { Portrait } from '@/components/ui/Portrait';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { cn, formatDate } from '@/lib/utils';

export function HistoryPage() {
  const { data, isLoading, error, refetch } = useSessionHistory();
  const { data: characters } = useCharacters();
  const [filter, setFilter] = useState<string | 'all'>('all');

  const sessions = useMemo(
    () => (data ?? []).filter((s) => filter === 'all' || s.character_id === filter),
    [data, filter],
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <header className="mb-10">
        <p className="eyebrow">Conversations</p>
        <h1 className="mt-4 text-3xl font-medium">지나온 대화</h1>
      </header>

      {characters && (data?.length ?? 0) > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {[{ id: 'all', name: '전체' }, ...characters].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition',
                filter === c.id ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-soft hover:border-line-strong',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {isLoading && <PageLoader />}
      {error && <ErrorState message="대화 기록을 불러오지 못했습니다." onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState
          title="아직 나눈 대화가 없습니다."
          body="한 사람을 골라 오늘의 생각을 이야기해 보세요."
          action={
            <Link to="/characters" className="rounded-full bg-accent px-6 py-3 text-sm text-accent-ink">
              인물 만나기
            </Link>
          }
        />
      )}

      <ol className="relative space-y-4 border-l border-line pl-6">
        {sessions.map((s) => (
          <li key={s.id} className="relative">
            <span className="absolute top-7 -left-[29px] h-2 w-2 rounded-full bg-gold/70 ring-4 ring-paper" />
            <Link
              to={`/chat/${s.id}`}
              className="block rounded-2xl border border-line bg-card px-6 py-5 transition hover:border-line-strong"
            >
              <div className="flex items-center gap-3">
                <Portrait
                  src={s.characters?.portrait_url ?? null}
                  name={s.characters?.name ?? ''}
                  shape="circle"
                  className="h-9 w-9"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.characters?.name}</p>
                  <p className="text-xs text-muted">
                    {formatDate(s.started_at)} · {s.topic ?? '자유로운 대화'}
                  </p>
                </div>
                {!s.ended_at && (
                  <span className="rounded-full border border-gold/50 px-2.5 py-0.5 text-[11px] text-gold">진행 중</span>
                )}
              </div>
              {s.reflection && (
                <p className="mt-4 border-l-2 border-gold/40 pl-4 font-display text-[15.5px] leading-relaxed text-ink">
                  {s.reflection}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
