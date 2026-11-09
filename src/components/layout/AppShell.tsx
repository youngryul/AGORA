import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/features/auth/auth-store';
import { signOut } from '@/features/auth/api';
import { isDark, useUIStore } from '@/stores/ui-store';
import { GrassWave, Leaf } from '@/components/ui/Decor';

const NAV = [
  { to: '/characters', label: '인물' },
  { to: '/history', label: '대화 기록', auth: true },
  { to: '/relationship', label: '관계', auth: true },
  { to: '/memory', label: '기억', auth: true },
];

function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const toggle = useUIStore((s) => s.toggleTheme);
  const dark = isDark(theme);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? '아침의 섬으로' : '밤의 섬으로'}
      title={dark ? '아침의 섬으로' : '밤의 섬으로'}
      className="press flex h-10 w-10 items-center justify-center rounded-full bg-card text-gold shadow-[0_3px_0_var(--card-edge)]"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('group inline-flex items-center gap-1.5 font-display text-[26px] text-ink', className)}>
      <Leaf className="h-7 w-7 transition group-hover:-rotate-12" />
      <span className="tracking-[0.06em]">AGORA</span>
    </Link>
  );
}

export function AppShell() {
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const mobileOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileNavOpen);

  useEffect(() => setMobileOpen(false), [location.pathname, setMobileOpen]);

  const items = NAV.filter((n) => !n.auth || user);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full bg-card/90 px-5 shadow-[0_4px_0_var(--card-edge),0_14px_30px_-18px_rgb(var(--shadow)/0.45)] backdrop-blur-md sm:px-7">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 font-display text-[16px] transition',
                    isActive ? 'bg-gold text-gold-ink shadow-[0_3px_0_var(--gold-edge)]' : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
                className="hidden rounded-full px-3 py-2 font-display text-[15px] text-muted transition hover:text-ink md:block"
              >
                로그아웃
              </button>
            ) : (
              <Link to="/login" className="press hidden rounded-full bg-accent px-5 py-2 font-display text-[15px] text-accent-ink shadow-[0_3px_0_var(--accent-edge)] md:block">
                로그인
              </Link>
            )}
            <button
              type="button"
              className="press flex h-10 w-10 items-center justify-center rounded-full bg-paper-2 text-ink-soft md:hidden"
              aria-label="메뉴"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="speech animate-fade-up mx-auto mt-2 max-w-6xl px-6 py-3 md:hidden">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} className="block py-3 font-display text-xl text-ink">
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <button type="button" onClick={() => signOut().then(() => navigate('/'))} className="block py-3 font-display text-muted">
                로그아웃
              </button>
            ) : (
              <Link to="/login" className="block py-3 font-display text-accent">
                로그인
              </Link>
            )}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16">
        <GrassWave />
        <div className="bg-accent text-accent-ink">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 pt-4 pb-8 text-[13px] opacity-90 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="font-display text-[16px]">AGORA · 시대를 넘어, 대화하다</span>
          <span>
            AGORA는 의료·심리치료 서비스가 아닙니다. 위급한 상황이라면 109(자살예방 상담전화) 또는 119에 연락하세요.
          </span>
        </div>
        </div>
      </footer>
    </div>
  );
}
