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
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition disabled:opacity-50',
        checked ? 'border-accent bg-accent' : 'border-line-strong bg-paper-2',
      )}
    >
      <span
        className={cn(
          'inline-block h-4.5 w-4.5 rounded-full shadow-sm transition-transform',
          checked ? 'translate-x-[22px] bg-accent-ink' : 'translate-x-[3px] bg-card',
        )}
      />
    </button>
  );
}
