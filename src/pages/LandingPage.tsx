import { Link } from 'react-router';
import { useCharacters } from '@/features/characters/api';
import { Portrait } from '@/components/ui/Portrait';
import { primaryButtonClass } from '@/components/ui/Button';
import { Cloud, Flower, Leaf, NextCaret } from '@/components/ui/Decor';

const PRINCIPLES = [
  {
    icon: '?',
    color: 'bg-sky text-ink',
    title: '정답 대신 질문',
    body: '그들은 해결책을 서둘러 건네지 않습니다. 당신이 스스로의 생각을 발견하도록 묻습니다.',
  },
  {
    icon: '♥',
    color: 'bg-blossom text-white',
    title: '지난 이야기를 기억하는 상대',
    body: '대화를 거듭할수록 당신의 고민과 가치, 변화를 조금씩 알아갑니다. 기억은 언제든 확인하고 지울 수 있습니다.',
  },
  {
    icon: '✎',
    color: 'bg-gold text-gold-ink',
    title: '실제 저작에 뿌리 둔 목소리',
    body: '각 인물의 생애와 저작, 사상을 바탕으로 말합니다. 실제 인용과 해석을 구분하고, 없는 명언을 만들지 않습니다.',
  },
];

export function LandingPage() {
  const { data: characters } = useCharacters();

  return (
    <div>
      {/* Hero */}
      <section className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pt-16 pb-16 text-center sm:pt-24">
        <Cloud className="animate-drift absolute top-10 left-2 w-24 opacity-80 sm:left-0 sm:w-32" />
        <Cloud className="animate-drift absolute top-28 right-0 w-20 opacity-70 [animation-delay:-3s] sm:w-28" />

        <p className="name-tag animate-fade-up text-[16px]">어서 오세요!</p>
        <h1
          className="animate-fade-up mt-6 flex items-center gap-3 font-display text-6xl text-ink sm:text-8xl"
          style={{ animationDelay: '80ms' }}
        >
          <Leaf className="animate-sway h-14 w-14 sm:h-20 sm:w-20" />
          AGORA
        </h1>

        <div
          className="speech animate-fade-up relative mt-10 max-w-lg px-9 pt-8 pb-9"
          style={{ animationDelay: '180ms' }}
        >
          <p className="font-display text-2xl text-ink sm:text-[28px]">시대를 넘어, 대화하다.</p>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            과거의 사상가와 오늘의 고민을 이야기하세요.
            <br />
            그들은 당신을 기억하고, 당신의 생각이 자라도록 묻습니다.
          </p>
          <NextCaret className="absolute right-8 bottom-3" />
        </div>

        <div className="animate-fade-up mt-10 flex flex-wrap justify-center gap-3" style={{ animationDelay: '280ms' }}>
          <Link to="/characters" className={`${primaryButtonClass} h-14 px-9 text-[18px]`}>
            대화 상대 만나러 가기
          </Link>
        </div>
      </section>

      {/* Characters preview */}
      {characters && characters.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="mb-10 flex items-center justify-center gap-3">
            <Flower />
            <h2 className="font-display text-2xl">섬에 사는 사상가들</h2>
            <Flower color="var(--sky)" />
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
            {characters.map((c, i) => (
              <Link
                key={c.id}
                to={`/characters/${c.code}`}
                className="group animate-fade-up text-center"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <Portrait
                  src={c.portrait_url}
                  name={c.name}
                  className="mx-auto aspect-[4/5] w-40 transition duration-300 group-hover:-translate-y-2 group-hover:-rotate-2"
                />
                <span className="name-tag mt-5 text-[18px]">{c.name}</span>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{c.short_philosophy}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Principles */}
      <section className="mx-auto max-w-5xl px-6 pb-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <div key={p.title} className="cozy-card animate-fade-up p-7" style={{ animationDelay: `${i * 90}ms` }}>
              <span
                aria-hidden
                className={`flex h-11 w-11 items-center justify-center rounded-full font-display text-xl ${p.color}`}
              >
                {p.icon}
              </span>
              <h2 className="mt-4 text-xl">{p.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
