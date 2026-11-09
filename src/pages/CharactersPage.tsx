import { useCharacters } from '@/features/characters/api';
import { CharacterCard } from '@/features/characters/CharacterCard';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';

export function CharactersPage() {
  const { data, isLoading, error, refetch } = useCharacters();

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <header className="mb-14 text-center">
        <span className="name-tag">이웃 주민</span>
        <h1 className="mt-5 text-3xl sm:text-[42px]">누구와 이야기해 볼까요?</h1>
        <p className="mt-4 text-[16px] text-ink-soft">각자 다른 시대, 다른 방식으로 삶을 물었던 사람들입니다.</p>
      </header>

      {isLoading && <PageLoader />}
      {error && <ErrorState message="인물 목록을 불러오지 못했습니다." onRetry={() => refetch()} />}
      {data && (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c, i) => (
            <CharacterCard key={c.id} character={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
