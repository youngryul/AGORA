import { cn } from '@/lib/utils';
import { NextCaret } from '@/components/ui/Decor';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  characterName: string;
  streaming?: boolean;
}

/** 인물의 말은 이름표가 달린 크림색 말풍선으로, 사용자의 말은 민트색 작은 말풍선으로 */
export function MessageBubble({ role, content, characterName, streaming }: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[85%] rounded-[28px] rounded-br-lg bg-bubble-user px-5 py-3 text-[15.5px] leading-relaxed whitespace-pre-wrap text-bubble-user-ink shadow-[0_3px_0_color-mix(in_srgb,var(--bubble-user)_70%,var(--accent-edge))] sm:max-w-[75%]">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up relative pt-4">
      <span className="name-tag absolute top-0 left-6 z-10">{characterName}</span>
      <div className="speech max-w-[96%] px-7 pt-7 pb-6 sm:max-w-[88%]">
        <div className={cn('text-[16.5px] leading-[1.9] whitespace-pre-wrap text-ink', streaming && 'streaming-caret')}>
          {content}
        </div>
        {!streaming && <NextCaret className="absolute right-6 bottom-2.5" />}
      </div>
    </div>
  );
}

export function ThinkingIndicator({ characterName }: { characterName: string }) {
  return (
    <div className="animate-fade-up relative pt-4">
      <span className="name-tag absolute top-0 left-6 z-10">{characterName}</span>
      <div
        className="speech inline-flex items-center gap-2 px-8 pt-7 pb-5"
        aria-label={`${characterName}이(가) 생각하는 중`}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-hop h-2.5 w-2.5 rounded-full bg-gold"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
