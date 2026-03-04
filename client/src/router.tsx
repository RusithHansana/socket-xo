import { createBrowserRouter, redirect } from 'react-router-dom';
import type { LoaderFunctionArgs, RouteObject } from 'react-router-dom';
import RootLayout, {
  LobbyPage,
  AIGamePage,
  OnlineGamePage,
  DevModePage,
} from './components/root-layout';
import ErrorPage from './pages/error-page';

/** Alphanumeric + hyphens, 1–50 chars, must not start or end with a hyphen. */
const ROOM_ID_PATTERN = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/i;

function onlineGamePageLoader({ params }: LoaderFunctionArgs) {
  const { roomId } = params;
  if (!roomId || !ROOM_ID_PATTERN.test(roomId)) {
    return redirect('/');
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
