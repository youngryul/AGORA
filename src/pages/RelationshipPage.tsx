import { Link } from 'react-router';
import { useRelationships, type RelationshipOverview } from '@/features/relationship/api';
import { useCharacters } from '@/features/characters/api';
import { useDeleteMemory } from '@/features/memory/api';
import { Portrait } from '@/components/ui/Portrait';
import { primaryButtonClass } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { formatDate, formatShortDate, josa } from '@/lib/utils';
import type { Character } from '@/types/database';

function RelationshipCard({ overview, character }: { overview: RelationshipOverview; character: Character }) {
  const deleteMemory = useDeleteMemory();
  const themes = overview.profile?.themes.length ? overview.profile.themes : overview.topics.map((t) => t.topic);

  return (
    <article className="cozy-card p-7 sm:p-9">
      <div className="flex items-center gap-5">
        <Portrait src={character.portrait_url} name={character.name} shape="circle" className="h-20 w-20" />
        <div>
          <p className="font-display text-2xl">
            {josa(character.name, '과', '와')} <span className="mx-0.5 inline-block rounded-full bg-gold px-2.5 text-gold-ink shadow-[0_2px_0_var(--gold-edge)]">{overview.sessionCount}</span>번 대화했습니다.
          </p>
          {overview.firstMetAt && (
            <p className="mt-1 text-xs text-muted">
              처음 만난 날 {formatDate(overview.firstMetAt)}
              {overview.lastMetAt && ` · 최근 ${formatDate(overview.lastMetAt)}`}
            </p>
          )}
        </div>
      </div>

      {themes.length > 0 && (
        <div className="mt-8">
          <p className="eyebrow mb-3">주요 대화 주제</p>
          <ul className="flex flex-wrap gap-2">
            {themes.slice(0, 6).map((t) => (
              <li key={t} className="chip bg-paper-2 text-ink-soft">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {overview.profile?.summary && (
        <div className="mt-8">
          <p className="eyebrow mb-3">우리의 대화</p>
          <p className="leading-relaxed text-ink-soft">{overview.profile.summary}</p>
        </div>
      )}

      {overview.profile?.recent_change && (
        <div className="mt-8 rounded-[24px] bg-leaf/20 px-6 py-5">
          <p className="eyebrow mb-2">최근 관계 변화</p>
          <p className="text-[16px] leading-relaxed">“{overview.profile.recent_change}”</p>
        </div>
      )}

      {overview.memories.length > 0 && (
        <details className="group mt-8">
          <summary className="cursor-pointer list-none font-display text-[15px] text-ink-soft hover:text-ink">
            <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span> {josa(character.name, '이', '가')} 기억하는 우리의 순간들 ({overview.memories.length})
          </summary>
          <ul className="mt-4 space-y-2">
            {overview.memories.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-4 rounded-[20px] bg-paper-2/70 px-5 py-3 text-[14.5px]">
                <span className="text-ink-soft">
                  <span className="mr-2 text-xs text-muted">{formatShortDate(m.created_at)}</span>
                  {m.content}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-muted hover:text-danger"
                  onClick={() => deleteMemory.mutate({ id: m.id, kind: 'relationship' })}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {overview.reflections.length > 0 && (
        <div className="mt-8">
          <p className="eyebrow mb-3">{josa(character.name, '이', '가')} 남긴 말</p>
          <ul className="space-y-3">
            {overview.reflections.slice(0, 3).map((r) => (
              <li key={r.date} className="text-[15px] leading-relaxed">
                <span className="mr-2 text-xs text-muted">{formatShortDate(r.date)}</span>
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        to={`/characters/${character.code}/topic`}
        className={`${primaryButtonClass} mt-9 px-6 py-2.5 text-[15px]`}
      >
        다시 이야기하기 →
      </Link>
    </article>
  );
}

export function RelationshipPage() {
  const { data, isLoading, error, refetch } = useRelationships();
  const { data: characters } = useCharacters();

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <header className="mb-10">
        <span className="name-tag">우정 기록</span>
        <h1 className="mt-5 text-4xl">함께 쌓아온 대화</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
          대화를 거듭하며 각 인물과 어떤 이야기를 나누어 왔는지, 그리고 당신이 어떻게 달라져 왔는지 돌아봅니다.
        </p>
      </header>

      {isLoading && <PageLoader />}
      {error && <ErrorState message="관계 정보를 불러오지 못했습니다." onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState
          title="아직 함께한 인물이 없습니다."
          action={
            <Link to="/characters" className="press inline-flex rounded-full bg-accent px-7 py-3 font-display text-[16px] text-accent-ink shadow-[0_4px_0_var(--accent-edge)]">
              인물 만나기
            </Link>
          }
        />
      )}
      <div className="space-y-6">
        {data?.map((o) => {
          const character = characters?.find((c) => c.id === o.characterId);
          return character ? <RelationshipCard key={o.characterId} overview={o} character={character} /> : null;
        })}
      </div>
    </div>
  );
}
