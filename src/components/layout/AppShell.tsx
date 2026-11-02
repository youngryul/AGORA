import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/features/auth/auth-store';
import { signOut } from '@/features/auth/api';
import { isDark, useUIStore } from '@/stores/ui-store';

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
      aria-label={dark ? '밝은 서재로' : '밤의 서재로'}
      title={dark ? '밝은 서재로' : '밤의 서재로'}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper-2 hover:text-ink"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('font-serif text-[22px] font-semibold tracking-[0.22em] text-ink', className)}>
      AGORA
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
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 text-sm transition',
                    isActive ? 'text-ink' : 'text-muted hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <span className="relative">
                    {item.label}
                    {isActive && <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold" />}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {user ? (
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
                className="hidden rounded-full px-3 py-2 text-sm text-muted transition hover:text-ink md:block"
              >
                로그아웃
              </button>
            ) : (
              <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm text-ink-soft hover:text-ink md:block">
                로그인
              </Link>
            )}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-paper-2 md:hidden"
              aria-label="메뉴"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="border-t border-line bg-paper px-5 py-3 md:hidden">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} className="block py-3 font-display text-lg text-ink">
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <button type="button" onClick={() => signOut().then(() => navigate('/'))} className="block py-3 text-muted">
                로그아웃
              </button>
            ) : (
              <Link to="/login" className="block py-3 text-muted">
                로그인
              </Link>
            )}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="font-serif tracking-[0.2em]">AGORA · 시대를 넘어, 대화하다</span>
          <span>
            AGORA는 의료·심리치료 서비스가 아닙니다. 위급한 상황이라면 109(자살예방 상담전화) 또는 119에 연락하세요.
          </span>
        </div>
      </footer>
    </div>
  );
}
