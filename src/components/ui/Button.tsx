import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg';

/** 동글동글하고 눌리는 버튼 — 아래쪽 그림자가 두께감을 만든다 */
const variants: Record<Variant, string> = {
  primary: 'press bg-accent text-accent-ink shadow-[0_4px_0_var(--accent-edge)]',
  secondary: 'press bg-card text-ink shadow-[0_4px_0_var(--card-edge)] ring-2 ring-line ring-inset',
  ghost: 'text-ink-soft hover:bg-paper-2 hover:text-ink',
  danger: 'press bg-danger text-white shadow-[0_4px_0_color-mix(in_srgb,var(--danger)_70%,black)]',
  link: 'text-ink-soft underline-offset-4 hover:text-ink hover:underline px-0',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[14px]',
  md: 'h-11 px-6 text-[15px]',
  lg: 'h-14 px-8 text-[17px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-display transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

/** 링크 등에 같은 모양을 입힐 때 쓰는 클래스 */
export const primaryButtonClass =
  'press inline-flex items-center justify-center gap-2 rounded-full bg-accent font-display text-accent-ink shadow-[0_4px_0_var(--accent-edge)]';
export const secondaryButtonClass =
  'press inline-flex items-center justify-center gap-2 rounded-full bg-card font-display text-ink shadow-[0_4px_0_var(--card-edge)] ring-2 ring-line ring-inset';
