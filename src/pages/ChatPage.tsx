import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useEndSession, useMessages, useSession } from '@/features/chat/api';
import { useChatStream } from '@/features/chat/useChatStream';
import { MessageBubble, ThinkingIndicator } from '@/features/chat/MessageBubble';
import { Composer } from '@/features/chat/Composer';
import { SafetyNotice } from '@/features/chat/SafetyNotice';
import { useCharacterById } from '@/features/characters/api';
import { useChatStore } from '@/stores/chat-store';
import { Portrait } from '@/components/ui/Portrait';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { formatDate, josa } from '@/lib/utils';

export function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const session = useSession(sessionId);
  const messages = useMessages(sessionId);
  const { data: character } = useCharacterById(session.data?.character_id);
  const { send, kickoff } = useChatStream(sessionId);
  const endSession = useEndSession(sessionId ?? '');

  const status = useChatStore((s) => s.status);
  const pending = useChatStore((s) => s.pending);
  const liveSafety = useChatStore((s) => s.safety);
  const streamError = useChatStore((s) => s.error);
  const setCurrent = useChatStore((s) => s.setCurrent);

  const [confirmEnd, setConfirmEnd] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const kickedOff = useRef(false);

  const ended = Boolean(session.data?.ended_at);
  const busy = status === 'waiting' || status === 'streaming';

  useEffect(() => {
    setCurrent(character ?? null, session.data ?? null);
    return () => setCurrent(null, null);
  }, [character, session.data, setCurrent]);

  // 첫 입장: 인물이 먼저 말을 건넨다 (지난 대화를 기억하고 있다면 그 이야기로)
  useEffect(() => {
    if (kickedOff.current || !session.data || ended || !messages.isSuccess) return;
    if (messages.data.length === 0) {
      kickedOff.current = true;
      kickoff();
    }
  }, [session.data, ended, messages.isSuccess, messages.data, kickoff]);

  // 새 내용이 생기면 아래로
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.data?.length, pending?.assistantText, pending?.userMessage, session.data?.reflection]);

  if (session.isLoading || messages.isLoading) return <PageLoader label="광장으로 걸어가는 중…" />;
  if (session.error || !session.data) {
    return (
      <EmptyState
        title="대화를 찾을 수 없습니다."
        action={
          <Link to="/characters" className="text-sm underline underline-offset-4">
            인물 목록으로
          </Link>
        }
      />
    );
  }

  const name = character?.name ?? '';
  const showSafety =
    liveSafety === 'crisis' || (messages.data ?? []).some((m) => m.metadata?.safety === 'crisis');

  const handleEnd = () => {
    endSession.mutate(undefined, { onSettled: () => setConfirmEnd(false) });
  };

  return (
    <div className="flex h-dvh flex-col bg-paper">
      {/* Header */}
      <header className="shrink-0 px-3 pt-3">
        <div className="mx-auto flex h-[72px] max-w-3xl items-center gap-4 rounded-full bg-card/95 px-4 shadow-[0_4px_0_var(--card-edge),0_14px_30px_-18px_rgb(var(--shadow)/0.45)] sm:px-5">
          <Link to="/characters" aria-label="나가기" className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-2 text-ink-soft">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          {character && <Portrait src={character.portrait_url} name={name} shape="circle" className="h-11 w-11" />}
          <div className="min-w-0 flex-1">
            <p className="font-display text-[19px] leading-tight">{name}</p>
            <p className="truncate text-[13px] text-muted">{session.data.topic ?? '자유로운 대화'}</p>
          </div>
          {!ended && (
            <Button variant="secondary" size="sm" onClick={() => setConfirmEnd(true)} disabled={busy || endSession.isPending}>
              대화 마치기
            </Button>
          )}
        </div>
      </header>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-7 px-4 py-8 sm:px-8">
          <p className="mx-auto w-fit rounded-full bg-card/70 px-4 py-1 text-center font-display text-[13px] text-muted">{formatDate(session.data.started_at)}</p>

          {showSafety && <SafetyNotice />}

          {(messages.data ?? []).map((m) => (
            <MessageBubble key={m.id} role={m.role as 'user' | 'assistant'} content={m.content} characterName={name} />
          ))}

          {pending?.userMessage && <MessageBubble role="user" content={pending.userMessage} characterName={name} />}
          {pending && status === 'waiting' && <ThinkingIndicator characterName={name} />}
          {pending && pending.assistantText && (
            <MessageBubble role="assistant" content={pending.assistantText} characterName={name} streaming={status === 'streaming'} />
          )}

          {status === 'error' && streamError && (
            <div className="rounded-[22px] border-2 border-danger/40 bg-card px-5 py-3 text-sm text-danger">
              {streamError} 잠시 후 다시 시도해 주세요.
            </div>
          )}

          {ended && (
            <section className="cozy-card animate-fade-up relative mt-10 px-8 pt-12 pb-10 text-center">
              <p className="name-tag absolute -top-4 left-1/2 -translate-x-1/2 rotate-0 text-[17px]">✿ 오늘의 대화 ✿</p>
              {session.data.reflection ? (
                <p className="mx-auto mt-2 max-w-lg font-display text-[22px] leading-relaxed text-ink">
                  {session.data.reflection}
                </p>
              ) : (
                <p className="mt-6 text-ink-soft">대화가 끝났습니다.</p>
              )}
              <p className="mt-4 font-display text-[15px] text-accent">— {name}</p>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                {character && (
                  <Button variant="secondary" onClick={() => navigate(`/characters/${character.code}/topic`)}>
                    {josa(name, '과', '와')} 다시 이야기하기
                  </Button>
                )}
                <Button variant="ghost" onClick={() => navigate('/history')}>
                  대화 기록 보기
                </Button>
              </div>
            </section>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      {!ended && (
        <div className="shrink-0">
          <div className="mx-auto max-w-3xl px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:px-8">
            <Composer onSend={send} disabled={busy} placeholder={`${name}에게 이야기해 보세요…`} />
            <p className="mt-3 text-center text-[12px] text-muted">
              역사적 인물의 사상을 바탕으로 재구성된 대화입니다. Enter 보내기 · Shift+Enter 줄바꿈
            </p>
          </div>
        </div>
      )}

      <Dialog open={confirmEnd} onClose={() => setConfirmEnd(false)} title="오늘의 대화를 마칠까요?">
        <p className="text-sm leading-relaxed text-ink-soft">
          {josa(name, "이", "가")} 오늘의 대화를 한 문장으로 정리해 드립니다. 기억 저장이 켜져 있다면, 다음 대화를 위해 중요한 내용을
          기억합니다.
        </p>
        <div className="mt-7 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
            계속 이야기하기
          </Button>
          <Button onClick={handleEnd} loading={endSession.isPending}>
            마치기
          </Button>
        </div>
        {endSession.error && <p className="mt-3 text-sm text-danger">{endSession.error.message}</p>}
      </Dialog>
    </div>
  );
}
