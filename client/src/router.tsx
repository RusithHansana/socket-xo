import { lazy, Suspense } from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';
import ErrorPage from './pages/error-page';
import PageLoader from './components/page-loader';

const LobbyPage = lazy(() => import('./pages/lobby-page'));
const AIGamePage = lazy(() => import('./pages/ai-game-page'));
const OnlineGamePage = lazy(() => import('./pages/online-game-page'));
const DevModePage = lazy(() => import('./pages/dev-mode-page'));

/** Alphanumeric + hyphens, 2–50 chars, must not start or end with a hyphen. */
const ROOM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/i;

function onlineGamePageLoader({ params }: LoaderFunctionArgs) {
  const { roomId } = params;
  if (!roomId || !ROOM_ID_PATTERN.test(roomId)) {
    return redirect('/');
  }
  return { roomId };
}

const routes = [
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LobbyPage />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/ai',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AIGamePage />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/game/:roomId',
    loader: onlineGamePageLoader,
    element: (
      <Suspense fallback={<PageLoader />}>
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
      <Suspense fallback={<PageLoader />}>
        <DevModePage />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  });
}

export const router = createBrowserRouter(routes);
