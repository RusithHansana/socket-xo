import { createBrowserRouter } from 'react-router-dom';
import LobbyPage from './pages/lobby-page';
import AIGamePage from './pages/ai-game-page';
import OnlineGamePage from './pages/online-game-page';
import DevModePage from './pages/dev-mode-page';
import ErrorPage from './pages/error-page';

const routes = [
  { path: '/', element: <LobbyPage />, errorElement: <ErrorPage /> },
  { path: '/ai', element: <AIGamePage />, errorElement: <ErrorPage /> },
  { path: '/game/:roomId', element: <OnlineGamePage />, errorElement: <ErrorPage /> },
];

if (import.meta.env.VITE_DEV_MODE === 'true') {
  routes.push({ path: '/test-lab', element: <DevModePage />, errorElement: <ErrorPage /> });
}

export const router = createBrowserRouter(routes);
