import { Suspense, useEffect } from 'react';
import { Outlet, useMatches } from 'react-router-dom';
import { ConnectionProvider } from '../contexts/connection.provider';
import { GameProvider } from '../contexts/game.provider';
import { ChatProvider } from '../contexts/chat.provider';
import { SocketProvider } from '../contexts/socket.provider';
import PageLoader from './page-loader';

/** Runtime type guard — narrows unknown route handle to an object with a string `title`. */
function hasTitle(h: unknown): h is { title: string } {
  return (
    typeof h === 'object' &&
    h !== null &&
    'title' in h &&
    typeof (h as Record<string, unknown>).title === 'string'
  );
}

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

  return (
    <ConnectionProvider>
      <GameProvider>
        <ChatProvider>
          <SocketProvider>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </SocketProvider>
        </ChatProvider>
      </GameProvider>
    </ConnectionProvider>
  );
}
