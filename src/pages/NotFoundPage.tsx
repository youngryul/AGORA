import { Link } from 'react-router';
import { EmptyState } from '@/components/ui/States';

export function NotFoundPage() {
  return (
    <EmptyState
      title="이 길 끝에는 아무도 없습니다."
      body="찾으시는 페이지가 없거나 옮겨졌습니다."
      action={
        <Link to="/" className="rounded-full bg-accent px-6 py-3 text-sm text-accent-ink">
          처음으로
        </Link>
      }
    />
  );
}
