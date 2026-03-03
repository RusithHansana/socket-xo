import { RouterProvider } from 'react-router-dom';
import { ConnectionProvider } from './contexts/connection.provider';
import { GameProvider } from './contexts/game.provider';
import { ChatProvider } from './contexts/chat.provider';
import { router } from './router';

function App() {
  return (
    <ConnectionProvider>
      <GameProvider>
        <ChatProvider>
          <RouterProvider router={router} />
        </ChatProvider>
      </GameProvider>
    </ConnectionProvider>
  );
}

export default App;
