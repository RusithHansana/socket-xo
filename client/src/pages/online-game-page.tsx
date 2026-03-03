import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function OnlineGamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId) {
      navigate('/', { replace: true });
    }
  }, [roomId, navigate]);

  if (!roomId) {
    return null;
  }

  return (
    <main>
      <h1>Online Game</h1>
      <p>Room: {roomId}</p>
    </main>
  );
}
