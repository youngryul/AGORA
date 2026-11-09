import { Link, useParams } from 'react-router';
import { useCharacter } from '@/features/characters/api';
import { Portrait } from '@/components/ui/Portrait';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/States';
import { formatLifetime } from '@/lib/utils';
import { primaryButtonClass } from '@/components/ui/Button';
import { NextCaret } from '@/components/ui/Decor';

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
      <Link to="/characters" className="chip chip-off inline-block">
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
          <h1 className="mt-2 text-5xl sm:text-6xl">{character.name}</h1>
          <p className="mt-2 font-serif text-lg font-bold text-muted">{character.name_en}</p>

          <div className="relative mt-10 pt-4">
            <span className="name-tag absolute top-0 left-6 z-10">{character.name}</span>
            <blockquote className="speech px-8 pt-8 pb-8 font-display text-xl leading-relaxed text-ink sm:text-2xl">
              “{character.short_philosophy}”
              <NextCaret className="absolute right-7 bottom-3" />
            </blockquote>
          </div>

          <p className="mt-8 text-[16px] leading-[1.9] text-ink-soft">{character.description}</p>

          {character.topics.length > 0 && (
            <div className="mt-10">
              <p className="eyebrow mb-4">주요 대화 주제</p>
              <ul className="flex flex-wrap gap-2">
                {character.topics.map((t) => (
                  <li key={t} className="chip chip-off">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link
              to={`/characters/${character.code}/topic`}
              className={`${primaryButtonClass} h-14 px-9 text-[18px]`}
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
