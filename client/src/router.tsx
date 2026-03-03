import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import ErrorPage from './pages/error-page';

const LobbyPage = lazy(() => import('./pages/lobby-page'));
const AIGamePage = lazy(() => import('./pages/ai-game-page'));
const OnlineGamePage = lazy(() => import('./pages/online-game-page'));
const DevModePage = lazy(() => import('./pages/dev-mode-page'));

const routes = [
  {
    path: '/',
    element: (
      <Suspense fallback={null}>
        <LobbyPage />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/ai',
    element: (
      <Suspense fallback={null}>
        <AIGamePage />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/game/:roomId',
    element: (
      <Suspense fallback={null}>
        <OnlineGamePage />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
];

if (import.meta.env.VITE_DEV_MODE === 'true') {
  routes.push({
    path: '/test-lab',
    element: (
      <Suspense fallback={null}>
        <DevModePage />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  });
}

export const router = createBrowserRouter(routes);
