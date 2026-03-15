import { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useMatches, useNavigate } from 'react-router-dom';
import { ConnectionProvider } from '../contexts/connection.provider';
import { GameProvider } from '../contexts/game.provider';
import { ChatProvider } from '../contexts/chat.provider';
import { SocketProvider } from '../contexts/socket.provider';
import { useConnectionStatus } from '../hooks/use-connection-status';
import { useGameState } from '../hooks/use-game-state';
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

function ReconnectNavigationSync() {
  const { status } = useConnectionStatus();
  const { roomId } = useGameState();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (status !== 'in_game' || roomId === null) {
      return;
    }

    const roomPath = `/game/${roomId}`;
    if (location.pathname === roomPath) {
      return;
    }

    navigate(roomPath);
  }, [location.pathname, navigate, roomId, status]);

  return null;
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
            <ReconnectNavigationSync />
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </SocketProvider>
        </ChatProvider>
      </GameProvider>
    </ConnectionProvider>
  );
}
