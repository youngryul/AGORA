import { createBrowserRouter } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { LandingPage } from '@/pages/LandingPage';
import { CharactersPage } from '@/pages/CharactersPage';
import { CharacterDetailPage } from '@/pages/CharacterDetailPage';
import { TopicSelectPage } from '@/pages/TopicSelectPage';
import { ChatPage } from '@/pages/ChatPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { MemoryPage } from '@/pages/MemoryPage';
import { RelationshipPage } from '@/pages/RelationshipPage';
import { LoginPage } from '@/pages/LoginPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// 공개: Landing, 인물 목록/소개, 로그인
// 로그인 필요: 주제 선택(세션 생성)부터 Chat, History, Relationship, Memory
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/characters', element: <CharactersPage /> },
      { path: '/characters/:code', element: <CharacterDetailPage /> },
      {
        path: '/characters/:code/topic',
        element: (
          <RequireAuth>
            <TopicSelectPage />
          </RequireAuth>
        ),
      },
      {
        path: '/history',
        element: (
          <RequireAuth>
            <HistoryPage />
          </RequireAuth>
        ),
      },
      {
        path: '/relationship',
        element: (
          <RequireAuth>
            <RelationshipPage />
          </RequireAuth>
        ),
      },
      {
        path: '/memory',
        element: (
          <RequireAuth>
            <MemoryPage />
          </RequireAuth>
        ),
      },
      { path: '/login', element: <LoginPage /> },
      { path: '/auth/callback', element: <AuthCallbackPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Chat 은 사이트 헤더/푸터 없이 조용한 전체 화면으로
  {
    path: '/chat/:sessionId',
    element: (
      <RequireAuth>
        <ChatPage />
      </RequireAuth>
    ),
  },
]);
