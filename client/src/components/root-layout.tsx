import { lazy, Suspense, useEffect } from 'react';
import { Outlet, useMatches } from 'react-router-dom';
import PageLoader from './page-loader';

// Re-export lazy pages so they are only ever instantiated once
export const LobbyPage = lazy(() => import('../pages/lobby-page'));
export const AIGamePage = lazy(() => import('../pages/ai-game-page'));
export const OnlineGamePage = lazy(() => import('../pages/online-game-page'));
export const DevModePage = lazy(() => import('../pages/dev-mode-page'));

/**
 * Root layout route. Provides:
 * - A single global <Suspense> fallback for all lazy-loaded child routes.
 * - Document title synchronisation via route `handle.title` metadata.
 */
export default function RootLayout() {
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
