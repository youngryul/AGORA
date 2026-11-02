import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthInitialized, useUser } from './auth-store';
import { PageLoader } from '@/components/ui/Spinner';

/** Chat 이후 기능은 로그인 필요. Landing / Character 소개는 공개. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const initialized = useAuthInitialized();
  const user = useUser();
  const location = useLocation();

  if (!initialized) return <PageLoader />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}
