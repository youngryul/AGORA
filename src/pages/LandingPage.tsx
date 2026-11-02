import { Link } from 'react-router';
import { useCharacters } from '@/features/characters/api';
import { Portrait } from '@/components/ui/Portrait';

const PRINCIPLES = [
  {
    title: '정답 대신 질문',
    body: '그들은 해결책을 서둘러 건네지 않습니다. 당신이 스스로의 생각을 발견하도록 묻습니다.',
  },
  {
    title: '지난 이야기를 기억하는 상대',
    body: '대화를 거듭할수록 당신의 고민과 가치, 변화를 조금씩 알아갑니다. 기억은 언제든 확인하고 지울 수 있습니다.',
  },
  {
    title: '실제 저작에 뿌리 둔 목소리',
    body: '각 인물의 생애와 저작, 사상을 바탕으로 말합니다. 실제 인용과 해석을 구분하고, 없는 명언을 만들지 않습니다.',
  },
];

export function LandingPage() {
  const { data: characters } = useCharacters();

  return (
    <div className="paper-texture">
      {/* Hero */}
      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pt-24 pb-20 text-center sm:pt-32">
        <p className="eyebrow animate-fade-up">A Space for Thought</p>
        <h1
          className="animate-fade-up mt-8 font-serif text-6xl font-semibold tracking-[0.18em] text-ink sm:text-7xl"
          style={{ animationDelay: '80ms' }}
        >
          AGORA
        </h1>
        <p className="animate-fade-up mt-8 font-display text-2xl text-ink sm:text-[28px]" style={{ animationDelay: '160ms' }}>
          시대를 넘어, 대화하다.
        </p>
        <p
          className="animate-fade-up mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft"
          style={{ animationDelay: '240ms' }}
        >
          과거의 사상가와 오늘의 고민을 이야기하세요.
          <br />
          그들은 당신을 기억하고, 당신의 생각이 자라도록 묻습니다.
        </p>
        <div className="animate-fade-up mt-10 flex flex-wrap justify-center gap-3" style={{ animationDelay: '320ms' }}>
          <Link
            to="/characters"
            className="rounded-full bg-accent px-8 py-3.5 text-[15px] font-medium text-accent-ink shadow-sm transition hover:opacity-90"
          >
            대화 상대 만나기
          </Link>
        </div>
      </section>

      {/* Characters preview */}
      {characters && characters.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="rule mb-14" />
          <div className="grid gap-10 sm:grid-cols-3">
            {characters.map((c) => (
              <Link key={c.id} to={`/characters/${c.code}`} className="group text-center">
                <Portrait
                  src={c.portrait_url}
                  name={c.name}
                  className="mx-auto aspect-[4/5] w-40 transition group-hover:-translate-y-1"
                />
                <h3 className="mt-5 text-xl">{c.name}</h3>
                <p className="mt-2 font-display text-sm leading-relaxed text-ink-soft">{c.short_philosophy}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Principles */}
      <section className="border-t border-line/70 bg-paper-2/60">
        <div className="mx-auto grid max-w-5xl gap-12 px-6 py-20 sm:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <div key={p.title}>
              <p className="font-serif text-sm text-gold">{['I', 'II', 'III'][i]}</p>
              <h2 className="mt-3 text-lg font-medium">{p.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
