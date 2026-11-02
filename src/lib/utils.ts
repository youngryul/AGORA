import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatYear(year: number | null): string {
  if (year === null) return '?';
  return year < 0 ? `기원전 ${-year}` : String(year);
}

export function formatLifetime(c: { lifetime_label: string | null; birth_year: number | null; death_year: number | null }) {
  return c.lifetime_label ?? `${formatYear(c.birth_year)} – ${formatYear(c.death_year)}`;
}

const dateFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' });

export const formatDate = (iso: string) => dateFormatter.format(new Date(iso));
export const formatShortDate = (iso: string) => shortDateFormatter.format(new Date(iso));
export const formatTime = (iso: string) => timeFormatter.format(new Date(iso));

/** "괴테와" / "소크라테스와" 처럼 받침에 맞는 조사 */
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return `${word}${withoutBatchim}`;
  return `${word}${(last - 0xac00) % 28 > 0 ? withBatchim : withoutBatchim}`;
}
