import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useCharacter } from '@/features/characters/api';
import { TOPIC_OPTIONS } from '@/features/characters/topics';
import { useCreateSession } from '@/features/chat/api';
import { Portrait } from '@/components/ui/Portrait';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/States';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { NextCaret } from '@/components/ui/Decor';

export function TopicSelectPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { data: character, isLoading } = useCharacter(code);
  const createSession = useCreateSession();
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) return <PageLoader />;
  if (!character) return <EmptyState title="이 인물을 찾을 수 없습니다." />;

  const start = (topic: string) => {
    setSelected(topic);
    createSession.mutate(
      { characterId: character.id, topic },
      { onSuccess: (session) => navigate(`/chat/${session.id}`, { replace: true }) },
    );
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-2xl flex-col justify-center px-5 py-16">
      <div className="animate-fade-up flex items-center gap-4">
        <Portrait src={character.portrait_url} name={character.name} shape="circle" className="h-14 w-14" />
        <div>
          <span className="name-tag">{character.name}</span>
          <p className="mt-1.5 ml-1 font-serif text-[13px] font-bold text-muted">{character.name_en}</p>
        </div>
      </div>

      <div className="speech animate-fade-up relative mt-6 px-8 pt-7 pb-8" style={{ animationDelay: '120ms' }}>
        <h1 className="font-display text-2xl leading-snug sm:text-[30px]">오늘은 어떤 이야기를 하고 싶나요?</h1>
        <NextCaret className="absolute right-7 bottom-3" />
      </div>

      <ul className="mt-8 space-y-3.5">
        {TOPIC_OPTIONS.map((t, i) => (
          <li key={t.id} className="animate-fade-up" style={{ animationDelay: `${200 + i * 60}ms` }}>
            <button
              type="button"
              disabled={createSession.isPending}
              onClick={() => start(t.label)}
              className={cn(
                'group press flex w-full items-center justify-between gap-4 rounded-full bg-card px-7 py-4 text-left shadow-[0_4px_0_var(--card-edge)] ring-2 ring-transparent ring-inset',
                'hover:ring-accent/50 disabled:opacity-60',
                selected === t.label && 'ring-accent',
              )}
            >
              <span className="flex items-center gap-3">
                <span aria-hidden className="text-gold transition group-hover:translate-x-0.5">▶</span>
                <span>
                <span className="block font-display text-[17px] text-ink">{t.label}</span>
                <span className="mt-0.5 block text-[13px] text-muted">{t.hint}</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <form
        className="animate-fade-up mt-6 flex gap-2"
        style={{ animationDelay: '600ms' }}
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) start(custom.trim().slice(0, 80));
        }}
      >
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="직접 적어도 좋습니다"
          maxLength={80}
          aria-label="직접 주제 입력"
        />
        <Button type="submit" variant="secondary" disabled={!custom.trim()} loading={createSession.isPending && selected === custom.trim()}>
          시작
        </Button>
      </form>

      {createSession.error && (
        <p className="mt-4 text-sm text-danger">대화를 시작하지 못했습니다: {createSession.error.message}</p>
      )}

      <Link to={`/characters/${character.code}`} className="chip chip-off mt-10 self-start">
        ← 돌아가기
      </Link>
    </div>
  );
}
