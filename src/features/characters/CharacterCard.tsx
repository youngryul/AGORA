import { Link } from 'react-router';
import { Portrait } from '@/components/ui/Portrait';
import { formatLifetime } from '@/lib/utils';
import type { Character } from '@/types/database';

export function CharacterCard({ character, index = 0 }: { character: Character; index?: number }) {
  return (
    <Link
      to={`/characters/${character.code}`}
      className="group cozy-card cozy-card-hover animate-fade-up flex flex-col p-6 pt-7"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <Portrait src={character.portrait_url} name={character.name} className="mx-auto aspect-[4/5] w-full max-w-[210px]" />
      <div className="mt-6 text-center">
        <span className="name-tag text-[19px]">{character.name}</span>
        <p className="mt-3 font-serif text-[13px] font-bold text-muted">
          {character.name_en} · {formatLifetime(character)}
        </p>
        <div className="speech mt-5 px-5 py-4 text-[15px] leading-relaxed text-ink-soft shadow-none ring-2 ring-line ring-inset">
          “{character.short_philosophy}”
        </div>
        {character.tagline && <p className="mt-3 font-display text-[13px] text-accent">{character.tagline}</p>}
      </div>
      <span className="mt-6 inline-flex items-center justify-center gap-1.5 self-center rounded-full bg-accent px-6 py-2.5 font-display text-[15px] text-accent-ink shadow-[0_4px_0_var(--accent-edge)] transition group-hover:-translate-y-0.5">
        말 걸기
        <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}
