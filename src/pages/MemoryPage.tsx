import { useMemo, useState } from 'react';
import { useUser } from '@/features/auth/auth-store';
import { useCharacters } from '@/features/characters/api';
import {
  useAIProfile,
  useConsolidateMemories,
  useDeleteAllMemories,
  useDeleteMemory,
  useMemories,
  useProfile,
  useSetMemoryEnabled,
  useUpdateMemory,
} from '@/features/memory/api';
import { MemoryCard } from '@/features/memory/MemoryCard';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { cn, formatDate } from '@/lib/utils';
import type { UserMemory } from '@/types/database';

type Scope = 'all' | 'global' | string;

export function MemoryPage() {
  const user = useUser();
  const profile = useProfile();
  const aiProfile = useAIProfile();
  const memories = useMemories();
  const { data: characters } = useCharacters();
  const setEnabled = useSetMemoryEnabled();
  const updateMemory = useUpdateMemory();
  const deleteMemory = useDeleteMemory();
  const deleteAll = useDeleteAllMemories();
  const consolidate = useConsolidateMemories();
  const [scope, setScope] = useState<Scope>('all');
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const characterName = (id: string | null) => characters?.find((c) => c.id === id)?.name;

  const filtered = useMemo(() => {
    const list = memories.data ?? [];
    if (scope === 'all') return list;
    if (scope === 'global') return list.filter((m) => m.character_id === null);
    return list.filter((m) => m.character_id === scope);
  }, [memories.data, scope]);

  if (profile.isLoading || memories.isLoading) return <PageLoader />;
  if (memories.error) return <ErrorState message="기억을 불러오지 못했습니다." onRetry={() => memories.refetch()} />;

  const enabled = profile.data?.memory_enabled ?? true;
  const ai = aiProfile.data;

  const meta = (m: UserMemory) => [
    m.character_id ? `${characterName(m.character_id) ?? '인물'}만 알고 있음` : '모든 인물이 참고',
    m.memory_type === 'episodic' ? '사건' : '나의 특성',
    formatDate(m.created_at),
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <header>
        <p className="eyebrow">Memory</p>
        <h1 className="mt-4 text-3xl font-medium">AGORA가 기억하고 있는 나</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          대화 속에서 중요해 보였던 것들입니다. 틀린 기억은 고치고, 원하지 않는 기억은 지울 수 있습니다.
        </p>
      </header>

      {/* Memory ON / OFF */}
      <section className="mt-10 flex items-start justify-between gap-6 rounded-2xl border border-line bg-card px-6 py-5">
        <div>
          <p className="font-medium">기억 사용</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {enabled
              ? '대화에서 중요한 내용을 기억하고, 다음 대화에서 참고합니다.'
              : '새로운 기억을 저장하지 않으며, 저장된 기억도 대화에 사용하지 않습니다.'}
          </p>
        </div>
        <Switch
          label="기억 사용"
          checked={enabled}
          disabled={!user || setEnabled.isPending}
          onCheckedChange={(v) => user && setEnabled.mutate({ userId: user.id, enabled: v })}
        />
      </section>

      {/* AI Profile summary */}
      {ai && (ai.summary || ai.values.length > 0 || ai.goals.length > 0) && (
        <section className="mt-6 rounded-2xl border border-line bg-paper-2/60 px-6 py-6">
          <p className="eyebrow">요약</p>
          {ai.summary && <p className="mt-3 font-display text-[16.5px] leading-relaxed">{ai.summary}</p>}
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            {[
              ['중요하게 여기는 것', ai.values],
              ['바라는 것', ai.goals],
              ['대화 방식', ai.preferences],
            ].map(([label, items]) =>
              (items as string[]).length ? (
                <div key={label as string}>
                  <dt className="text-xs text-muted">{label as string}</dt>
                  <dd className="mt-1.5 text-ink-soft">{(items as string[]).join(', ')}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </section>
      )}

      {/* Filters + actions */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', name: '전체' },
            { id: 'global', name: '공통' },
            ...(characters ?? []).map((c) => ({ id: c.id, name: c.name })),
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition',
                scope === s.id ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-soft hover:border-line-strong',
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          loading={consolidate.isPending}
          disabled={(memories.data?.length ?? 0) < 3}
          onClick={() =>
            consolidate.mutate(undefined, {
              onSuccess: (r) =>
                setNotice(r.merged > 0 ? `비슷한 기억 ${r.archived}개를 ${r.merged}개로 정리했습니다.` : '정리할 만큼 비슷한 기억이 없습니다.'),
              onError: (e) => setNotice(e.message),
            })
          }
        >
          비슷한 기억 정리하기
        </Button>
      </div>
      {notice && <p className="mt-3 text-sm text-ink-soft">{notice}</p>}

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            title="아직 기억하고 있는 것이 없습니다."
            body="대화를 마치면 그 대화에서 중요했던 것들이 이곳에 남습니다."
          />
        ) : (
          filtered.map((m) => (
            <MemoryCard
              key={m.id}
              content={m.content}
              importance={m.importance}
              meta={meta(m)}
              onSave={(content) => updateMemory.mutateAsync({ id: m.id, content })}
              onDelete={() => deleteMemory.mutateAsync({ id: m.id })}
            />
          ))
        )}
      </div>

      {/* Delete all */}
      <section className="mt-16 border-t border-line pt-8">
        <p className="text-sm font-medium">모든 기억 지우기</p>
        <p className="mt-1 text-sm text-ink-soft">
          저장된 기억, 인물과의 관계 기억, 요약을 모두 삭제합니다. 대화 기록은 남습니다.
        </p>
        <Button variant="danger" size="sm" className="mt-4" onClick={() => setConfirmDeleteAll(true)}>
          전체 삭제
        </Button>
      </section>

      <Dialog open={confirmDeleteAll} onClose={() => setConfirmDeleteAll(false)} title="모든 기억을 지울까요?">
        <p className="text-sm leading-relaxed text-ink-soft">
          인물들은 당신과 나눈 이야기를 더 이상 기억하지 못합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="mt-7 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDeleteAll(false)}>
            취소
          </Button>
          <Button
            variant="danger"
            loading={deleteAll.isPending}
            onClick={() => deleteAll.mutate(undefined, { onSuccess: () => setConfirmDeleteAll(false) })}
          >
            모두 지우기
          </Button>
        </div>
        {deleteAll.error && <p className="mt-3 text-sm text-danger">{deleteAll.error.message}</p>}
      </Dialog>
    </div>
  );
}
