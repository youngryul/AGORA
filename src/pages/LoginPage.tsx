import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/features/auth/api';
import { useUser } from '@/features/auth/auth-store';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Field';
import { Logo } from '@/components/layout/AppShell';

type Mode = 'signin' | 'signup';

/** 외부 URL 로의 open redirect 를 막는다 */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/characters';
}

export function LoginPage() {
  const user = useUser();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        const { needsConfirmation } = await signUpWithEmail(email, password, nickname.trim() || email.split('@')[0]);
        if (needsConfirmation) setInfo('확인 메일을 보냈습니다. 메일의 링크를 누르면 대화를 시작할 수 있습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Logo />
          <p className="name-tag mt-5 !block mx-auto w-fit text-[16px]">
            {mode === 'signin' ? '다시 와 줘서 반가워요!' : '섬에 오신 걸 환영해요!'}
          </p>
        </div>

        <div className="speech mt-8 p-8">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => signInWithGoogle(next).catch((e) => setError(e.message))}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8Z" />
              <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z" />
              <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z" />
            </svg>
            Google로 계속하기
          </Button>

          <div className="my-6 flex items-center gap-3 font-display text-[13px] text-muted">
            <span className="rule flex-1" /> 또는 이메일 <span className="rule flex-1" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <Label htmlFor="nickname">불리고 싶은 이름</Label>
                <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} placeholder="예: 영률" />
              </div>
            )}
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            {info && <p className="text-sm text-ink-soft">{info}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              {mode === 'signin' ? '로그인' : '가입하기'}
            </Button>
          </form>
        </div>

        <p className="mt-7 text-center text-[15px] text-muted">
          {mode === 'signin' ? '처음이신가요?' : '이미 계정이 있으신가요?'}{' '}
          <button
            type="button"
            className="font-display text-accent underline-offset-4 hover:underline"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setInfo(null);
            }}
          >
            {mode === 'signin' ? '가입하기' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  );
}
