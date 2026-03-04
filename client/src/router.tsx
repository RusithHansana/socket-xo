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

/** Alphanumeric + hyphens, 1–50 chars, must not start or end with a hyphen. */
const ROOM_ID_PATTERN = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/i;

export function onlineGamePageLoader({ params }: LoaderFunctionArgs) {
  const { roomId } = params;
  if (!roomId || !ROOM_ID_PATTERN.test(roomId)) {
    throw new Response(
      `Invalid room ID: "${roomId ?? ''}". Room IDs must be 1–50 alphanumeric characters or hyphens.`,
      { status: 404, statusText: 'Not Found' },
    );
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
    children: [
      {
        // Pathless layout route — error boundary runs INSIDE RootLayout so context providers are available.
        errorElement: <ErrorPage />,
        children: childRoutes,
      },
    ],
  },
]);
