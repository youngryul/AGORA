import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** 네이티브 <dialog> 기반 모달 — 말풍선 모양 (포커스 트랩/ESC 처리는 브라우저에 맡긴다) */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'speech m-auto w-[min(92vw,30rem)] overflow-visible border-0 p-0 text-ink backdrop:bg-[rgb(40_30_20/0.35)] backdrop:backdrop-blur-[3px]',
        className,
      )}
    >
      <div className="px-8 pt-9 pb-7">
        {title && (
          <h2 className="name-tag absolute -top-4 left-7 max-w-[85%] truncate text-[16px]">{title}</h2>
        )}
        {children}
      </div>
    </dialog>
  );
}
