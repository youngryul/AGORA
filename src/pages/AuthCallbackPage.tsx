import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { supabase } from '@/lib/supabase/client';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/States';

/** OAuth / 이메일 확인 리다이렉트 처리 (PKCE code 교환은 supabase-js 가 detectSessionInUrl 로 수행) */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(params.get('error_description'));

  useEffect(() => {
    if (error) return;
    const next = params.get('next');
    const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/characters';

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate(target, { replace: true });
    });
    supabase.auth.getSession().then(({ data: s, error: e }) => {
      if (e) setError(e.message);
      else if (s.session) navigate(target, { replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [error, navigate, params]);

  if (error) {
    return (
      <EmptyState
        title="로그인을 완료하지 못했습니다."
        body={error}
        action={
          <Link to="/login" className="text-sm underline underline-offset-4">
            다시 시도
          </Link>
        }
      />
    );
  }
  return <PageLoader label="문을 여는 중…" />;
}
