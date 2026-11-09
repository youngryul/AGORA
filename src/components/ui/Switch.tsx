import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

export function Switch({ checked, onCheckedChange, disabled, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition disabled:opacity-50',
        checked ? 'bg-accent shadow-[inset_0_-3px_0_var(--accent-edge)]' : 'bg-line-strong shadow-[inset_0_-3px_0_rgb(0_0_0/0.08)]',
      )}
    >
      <span
        className={cn(
          'inline-block h-6 w-6 rounded-full bg-card shadow-[0_2px_0_rgb(0_0_0/0.15)] transition-transform duration-200',
          checked ? 'translate-x-[28px]' : 'translate-x-[4px]',
        )}
      />
    </button>
  );
}
