import { cn } from '@/lib/utils';

interface PortraitProps {
  src: string | null;
  name: string;
  className?: string;
  shape?: 'arch' | 'circle';
}

/** 인물 초상. 기본은 고전 아치 프레임 */
export function Portrait({ src, name, className, shape = 'arch' }: PortraitProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-paper-2 ring-1 ring-line',
        shape === 'arch' ? 'rounded-t-[999px] rounded-b-md' : 'rounded-full',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={`${name}의 초상`} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-serif text-4xl text-muted">
          {name.slice(0, 1)}
        </div>
      )}
    </div>
  );
}
