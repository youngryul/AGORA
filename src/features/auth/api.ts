import { supabase } from '@/lib/supabase/client';

const callbackUrl = () => `${window.location.origin}/auth/callback`;

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translateAuthError(error.message));
}

export async function signUpWithEmail(email: string, password: string, nickname: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname }, emailRedirectTo: callbackUrl() },
  });
  if (error) throw new Error(translateAuthError(error.message));
  /** 이메일 확인이 켜져 있으면 session 이 null 로 돌아온다 */
  return { needsConfirmation: !data.session };
}

export async function signInWithGoogle(redirectTo?: string) {
  const url = new URL(callbackUrl());
  if (redirectTo) url.searchParams.set('next', redirectTo);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: url.toString() },
  });
  if (error) throw new Error(translateAuthError(error.message));
}

export async function signOut() {
  await supabase.auth.signOut();
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (/already registered/i.test(message)) return '이미 가입된 이메일입니다.';
  if (/password should be at least/i.test(message)) return '비밀번호는 6자 이상이어야 합니다.';
  if (/email not confirmed/i.test(message)) return '이메일 인증을 완료해 주세요.';
  if (/provider is not enabled/i.test(message)) return 'Google 로그인이 아직 활성화되지 않았습니다.';
  return message;
}
