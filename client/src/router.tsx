import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Outlet, redirect, useMatches } from 'react-router-dom';
import type { LoaderFunctionArgs, RouteObject } from 'react-router-dom';
import ErrorPage from './pages/error-page';
import PageLoader from './components/page-loader';

const LobbyPage = lazy(() => import('./pages/lobby-page'));
const AIGamePage = lazy(() => import('./pages/ai-game-page'));
const OnlineGamePage = lazy(() => import('./pages/online-game-page'));
const DevModePage = lazy(() => import('./pages/dev-mode-page'));

/** Alphanumeric + hyphens, 1–50 chars, must not start or end with a hyphen. */
const ROOM_ID_PATTERN = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/i;

function onlineGamePageLoader({ params }: LoaderFunctionArgs) {
  const { roomId } = params;
  if (!roomId || !ROOM_ID_PATTERN.test(roomId)) {
    return redirect('/');
  }
  return { roomId };
}

/**
 * Root layout route. Provides:
 * - A single global <Suspense> fallback for all lazy-loaded child routes.
 * - Document title synchronisation via route `handle.title` metadata.
 */
function RootLayout() {
  const matches = useMatches();

  useEffect(() => {
    const lastMatch = matches[matches.length - 1];
    const handle = lastMatch?.handle as { title?: string } | undefined;
    document.title = handle?.title ? `${handle.title} | socket-xo` : 'socket-xo';
  }, [matches]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

const childRoutes: RouteObject[] = [
  {
    index: true,
    element: <LobbyPage />,
    handle: { title: 'Lobby' },
  },
  {
    path: 'ai',
    element: <AIGamePage />,
    handle: { title: 'AI Game' },
  },
  {
    path: 'game/:roomId',
    loader: onlineGamePageLoader,
    element: <OnlineGamePage />,
    handle: { title: 'Online Game' },
  },
];

if (import.meta.env.VITE_DEV_MODE === 'true') {
  childRoutes.push({
    path: 'test-lab',
    element: <DevModePage />,
    handle: { title: 'Dev Mode' },
  });
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: childRoutes,
  },
]);
