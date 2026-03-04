import { useLoaderData } from 'react-router-dom';
import type { onlineGamePageLoader } from '../router';

type LoaderData = Awaited<ReturnType<typeof onlineGamePageLoader>>;

/**
 * Runtime type guard — validates the loader data shape before use,
 * replacing the unsafe direct `as LoaderData` cast.
 */
function asLoaderData(data: unknown): LoaderData {
  if (
    typeof data === 'object' &&
    data !== null &&
    'roomId' in data &&
    typeof (data as { roomId: unknown }).roomId === 'string'
  ) {
    return data as LoaderData;
  }
  throw new Error('OnlineGamePage: unexpected loader data shape — expected { roomId: string }');
}

export default function OnlineGamePage() {
  const { roomId } = asLoaderData(useLoaderData());

  return (
    <main className="page">
      <h1>Online Game</h1>
      <p className="page__description">Room: {roomId}</p>
    </main>
  );
}
