import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_LENGTH = 4000;

export function Composer({ onSend, disabled, placeholder }: ComposerProps) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  // 내용에 맞춰 높이 자동 조절
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="speech flex items-end gap-2 p-2 pl-6 ring-2 ring-transparent ring-inset transition focus-within:ring-accent/50"
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        maxLength={MAX_LENGTH}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder ?? '생각을 천천히 적어 보세요…'}
        aria-label="메시지 입력"
        className="max-h-[220px] min-h-[48px] flex-1 resize-none bg-transparent py-3 text-[16px] leading-relaxed text-ink placeholder:text-muted focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="보내기"
        className={cn(
          'press flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_4px_0_var(--accent-edge)]',
          'disabled:cursor-not-allowed disabled:opacity-35',
        )}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M3.4 20.4 21 12 3.4 3.6l-.1 6.5L15 12 3.3 13.9Z" />
        </svg>
      </button>
    </form>
  );
}
