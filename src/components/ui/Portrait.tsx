import { cn } from '@/lib/utils';

interface PortraitProps {
  src: string | null;
  name: string;
  className?: string;
  shape?: 'arch' | 'circle';
}

/** 인물 초상. 기본은 동글동글한 액자, 작은 크기는 동그란 배지 */
export function Portrait({ src, name, className, shape = 'arch' }: PortraitProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden bg-paper-2',
        shape === 'arch'
          ? 'rounded-[42%_42%_32px_32px/38%_38%_32px_32px] border-[6px] border-card shadow-[0_6px_0_var(--card-edge),0_16px_28px_-16px_rgb(var(--shadow)/0.5)]'
          : 'rounded-full border-[3px] border-card shadow-[0_3px_0_var(--card-edge)]',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={`${name}의 초상`} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-leaf/40 font-display text-4xl text-ink-soft">
          {name.slice(0, 1)}
        </div>
      )}
    </div>
  );
}
