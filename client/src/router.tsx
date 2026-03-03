import { createBrowserRouter } from 'react-router-dom';
import LobbyPage from './pages/lobby-page';
import AIGamePage from './pages/ai-game-page';
import OnlineGamePage from './pages/online-game-page';
import DevModePage from './pages/dev-mode-page';

const routes = [
  { path: '/', element: <LobbyPage /> },
  { path: '/ai', element: <AIGamePage /> },
  { path: '/game/:roomId', element: <OnlineGamePage /> },
];

if (import.meta.env.VITE_DEV_MODE === 'true') {
  routes.push({ path: '/test-lab', element: <DevModePage /> });
}

export const router = createBrowserRouter(routes);
