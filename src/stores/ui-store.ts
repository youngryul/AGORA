import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface UIState {
  theme: ThemePreference;
  mobileNavOpen: boolean;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function isDark(theme: ThemePreference) {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark());
}

export function applyTheme(theme: ThemePreference) {
  document.documentElement.classList.toggle('dark', isDark(theme));
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      mobileNavOpen: false,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => get().setTheme(isDark(get().theme) ? 'light' : 'dark'),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
    }),
    { name: 'agora-ui', partialize: (s) => ({ theme: s.theme }) },
  ),
);
