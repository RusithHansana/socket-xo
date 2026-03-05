import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
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
    // Throw a 404 Response so React Router renders the route-level errorElement
    // (NotFoundPage) in-place — no URL change, no history push, no back-button trap.
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' });
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
    // Route-level error boundary: renders NotFoundPage in-place for loader errors
    // (e.g. invalid roomId). Keeps context providers alive and avoids a history push.
    errorElement: <NotFoundPage />,
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
