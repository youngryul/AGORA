import { Link, useParams } from 'react-router';
import { useCharacter } from '@/features/characters/api';
import { Portrait } from '@/components/ui/Portrait';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/States';
import { formatLifetime } from '@/lib/utils';

export function CharacterDetailPage() {
  const { code } = useParams();
  const { data: character, isLoading } = useCharacter(code);

  if (isLoading) return <PageLoader />;
  if (!character) {
    return (
      <EmptyState
        title="이 인물을 찾을 수 없습니다."
        action={
          <Link to="/characters" className="text-sm text-ink-soft underline underline-offset-4">
            인물 목록으로
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
      <Link to="/characters" className="text-sm text-muted hover:text-ink">
        ← 인물 목록
      </Link>

      <div className="mt-10 grid items-start gap-12 md:grid-cols-[minmax(0,320px)_1fr] md:gap-16">
        <Portrait
          src={character.portrait_url}
          name={character.name}
          className="animate-fade-up mx-auto aspect-[4/5] w-full max-w-[320px]"
        />

        <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <p className="eyebrow">{formatLifetime(character)}</p>
          <h1 className="mt-3 text-4xl font-medium sm:text-5xl">{character.name}</h1>
          <p className="mt-2 font-serif text-lg italic text-muted">{character.name_en}</p>

          <blockquote className="mt-10 border-l-2 border-gold/60 pl-6 font-display text-xl leading-relaxed text-ink sm:text-2xl">
            {character.short_philosophy}
          </blockquote>

          <p className="mt-8 text-[15px] leading-[1.9] text-ink-soft">{character.description}</p>

          {character.topics.length > 0 && (
            <div className="mt-10">
              <p className="eyebrow mb-4">주요 대화 주제</p>
              <ul className="flex flex-wrap gap-2">
                {character.topics.map((t) => (
                  <li key={t} className="rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link
              to={`/characters/${character.code}/topic`}
              className="rounded-full bg-accent px-8 py-3.5 text-[15px] font-medium text-accent-ink shadow-sm transition hover:opacity-90"
            >
              대화 시작하기
            </Link>
            <p className="text-xs leading-relaxed text-muted">
              이 인물의 말은 생애와 저작에 근거해 재구성된 것입니다.
              <br />
              실제 인용에는 출처를 밝힙니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
