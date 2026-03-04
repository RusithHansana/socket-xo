import { useLoaderData } from 'react-router-dom';
import type { onlineGamePageLoader } from '../router';

type LoaderData = Awaited<ReturnType<typeof onlineGamePageLoader>>;

export default function OnlineGamePage() {
  const { roomId } = useLoaderData() as LoaderData;

  return (
    <main className="page">
      <h1>Online Game</h1>
      <p className="page__description">Room: {roomId}</p>
    </main>
  );
}
