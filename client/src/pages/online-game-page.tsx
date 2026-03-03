import { useParams } from 'react-router-dom';

export default function OnlineGamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  return (
    <main>
      <h1>Online Game</h1>
      <p>Room: {roomId}</p>
    </main>
  );
}
