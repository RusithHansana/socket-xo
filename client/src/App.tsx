import { RouterProvider } from 'react-router-dom';
import { ConnectionProvider } from './contexts/connection.context';
import { GameProvider } from './contexts/game.context';
import { ChatProvider } from './contexts/chat.context';
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
