import { Suspense, useEffect } from 'react';
import { Outlet, useMatches } from 'react-router-dom';

/** Runtime type guard — narrows unknown route handle to an object with a string `title`. */
function hasTitle(h: unknown): h is { title: string } {
  return (
    typeof h === 'object' &&
    h !== null &&
    'title' in h &&
    typeof (h as Record<string, unknown>).title === 'string'
  );
}
import { ConnectionProvider } from '../contexts/connection.provider';
import { GameProvider } from '../contexts/game.provider';
import { ChatProvider } from '../contexts/chat.provider';
import PageLoader from './page-loader';

/**
 * Root layout route. Provides:
 * - Context providers (inside RouterProvider so they can access routing hooks).
 * - A single global <Suspense> fallback for all lazy-loaded child routes.
 * - Document title synchronisation via route `handle.title` metadata.
 */
export default function RootLayout() {
  const matches = useMatches();
  const lastMatch = matches[matches.length - 1];
  const pageTitle = hasTitle(lastMatch?.handle)
    ? `${lastMatch.handle.title} | socket-xo`
    : 'socket-xo';

  // Set title on every route change — no cleanup here to prevent same-session flicker.
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  // Reset title only when the layout unmounts (full app teardown).
  useEffect(() => {
    return () => {
      document.title = 'socket-xo';
    };
  }, []);

  return (
    <ConnectionProvider>
      <GameProvider>
        <ChatProvider>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ChatProvider>
      </GameProvider>
    </ConnectionProvider>
  );
}
