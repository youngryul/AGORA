import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  characterName: string;
  streaming?: boolean;
}

/** 인물의 말은 종이 위의 글처럼(serif, 말풍선 없음), 사용자의 말은 조용한 잉크색 카드로 */
export function MessageBubble({ role, content, characterName, streaming }: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-bubble-user px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-bubble-user-ink sm:max-w-[75%]">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">{characterName}</p>
      <div
        className={cn(
          'max-w-[95%] font-display text-[16.5px] leading-[1.95] whitespace-pre-wrap text-ink sm:max-w-[85%]',
          streaming && 'streaming-caret',
        )}
      >
        {content}
      </div>
    </div>
  );
}

export function ThinkingIndicator({ characterName }: { characterName: string }) {
  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">{characterName}</p>
      <div className="flex items-center gap-1.5 py-2 text-muted" aria-label={`${characterName}이(가) 생각하는 중`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold/70"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
