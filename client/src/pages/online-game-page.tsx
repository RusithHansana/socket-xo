import { useParams } from 'react-router-dom';

export default function OnlineGamePage() {
  const { roomId } = useParams<{ roomId: string }>();

  return (
    <main className="page">
      <h1>Online Game</h1>
      <p className="page__description">Room: {roomId}</p>
    </main>
  );
}
