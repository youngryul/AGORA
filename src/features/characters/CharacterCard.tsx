import { Link } from 'react-router';
import { Portrait } from '@/components/ui/Portrait';
import { formatLifetime } from '@/lib/utils';
import type { Character } from '@/types/database';

export function CharacterCard({ character, index = 0 }: { character: Character; index?: number }) {
  return (
    <Link
      to={`/characters/${character.code}`}
      className="group animate-fade-up flex flex-col rounded-2xl border border-line bg-card p-6 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_18px_40px_-24px_rgba(43,36,32,0.35)]"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <Portrait src={character.portrait_url} name={character.name} className="mx-auto aspect-[4/5] w-full max-w-[220px]" />
      <div className="mt-6 text-center">
        <p className="eyebrow">{formatLifetime(character)}</p>
        <h3 className="mt-2 text-2xl font-medium">{character.name}</h3>
        <p className="mt-1 font-serif text-sm italic text-muted">{character.name_en}</p>
        <div className="mx-auto my-4 h-px w-10 bg-gold/50" />
        <p className="font-display text-[15px] leading-relaxed text-ink-soft">“{character.short_philosophy}”</p>
        {character.tagline && <p className="mt-3 text-xs tracking-[0.18em] text-muted">{character.tagline}</p>}
      </div>
      <span className="mt-6 inline-flex items-center justify-center gap-1.5 self-center rounded-full border border-line-strong px-5 py-2 text-sm text-ink transition group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink">
        대화하기
        <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}
