import { lazy } from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';
import type { LoaderFunctionArgs, RouteObject } from 'react-router-dom';
import RootLayout from './components/root-layout';
import ErrorPage from './pages/error-page';

// Lazy-loaded page components (code-split per route)
const LobbyPage = lazy(() => import('./pages/lobby-page'));
const AIGamePage = lazy(() => import('./pages/ai-game-page'));
const OnlineGamePage = lazy(() => import('./pages/online-game-page'));
const DevModePage = lazy(() => import('./pages/dev-mode-page'));
const NotFoundPage = lazy(() => import('./pages/not-found-page'));

/**
 * Canonical slug pattern for room IDs.
 * - Lowercase alphanumeric only (no uppercase, no `i` flag → enforces canonicality at the route level).
 * - Segments separated by single hyphens; consecutive hyphens are implicitly prevented
 *   because each segment must be `[a-z0-9]+`.
 * - Total length capped at 50 characters via the separate length check below.
 */
const ROOM_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function onlineGamePageLoader({ params }: LoaderFunctionArgs) {
  const { roomId } = params;
  if (!roomId || roomId.length > 50 || !ROOM_ID_PATTERN.test(roomId)) {
    // Client-side redirect to the wildcard (*) route so NotFoundPage renders
    // with a <Link> for history-based navigation (no full page reload).
    return redirect('/not-found');
  }
  return { roomId };
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
  ...(import.meta.env.VITE_DEV_MODE === 'true'
    ? [
        {
          path: 'test-lab',
          element: <DevModePage />,
          handle: { title: 'Dev Mode' },
        } satisfies RouteObject,
      ]
    : []),
  {
    path: '*',
    element: <NotFoundPage />,
    handle: { title: '404' },
  },
];

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    // Outer error boundary catches crashes in RootLayout itself (e.g. a context provider throwing).
    errorElement: <ErrorPage />,
    children: [
      {
        // Inner error boundary catches per-route errors while keeping context providers alive.
        errorElement: <ErrorPage />,
        children: childRoutes,
      },
    ],
  },
]);
