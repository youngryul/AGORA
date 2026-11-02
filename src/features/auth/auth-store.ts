import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';

interface AuthState {
  session: Session | null;
  user: User | null;
  initialized: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  user: null,
  initialized: false,
}));

let started = false;

/** 앱 시작 시 한 번: 저장된 세션 복원 + 인증 상태 변화 구독 */
export function startAuthListener(onSignedOut?: () => void) {
  if (started) return;
  started = true;

  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({ session: data.session, user: data.session?.user ?? null, initialized: true });
  });

  supabase.auth.onAuthStateChange((event, session) => {
    useAuthStore.setState({ session, user: session?.user ?? null, initialized: true });
    if (event === 'SIGNED_OUT') onSignedOut?.();
  });
}

export const useUser = () => useAuthStore((s) => s.user);
export const useAuthInitialized = () => useAuthStore((s) => s.initialized);
