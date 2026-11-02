import { useCharacters } from '@/features/characters/api';
import { CharacterCard } from '@/features/characters/CharacterCard';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';

export function CharactersPage() {
  const { data, isLoading, error, refetch } = useCharacters();

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <header className="mb-14 text-center">
        <p className="eyebrow">Interlocutors</p>
        <h1 className="mt-4 text-3xl font-medium sm:text-4xl">누구와 이야기하시겠습니까?</h1>
        <p className="mt-4 text-[15px] text-ink-soft">각자 다른 시대, 다른 방식으로 삶을 물었던 사람들입니다.</p>
      </header>

      {isLoading && <PageLoader />}
      {error && <ErrorState message="인물 목록을 불러오지 못했습니다." onRetry={() => refetch()} />}
      {data && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c, i) => (
            <CharacterCard key={c.id} character={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
