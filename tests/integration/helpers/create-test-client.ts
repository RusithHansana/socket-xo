import { io as ioClient, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';

export type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Creates a typed Socket.io client connected to the test server.
 * The client auto-connects with the given playerId in auth.
 * Returns a promise that resolves once the client is connected.
 *
 * Call `client.disconnect()` in afterAll/afterEach to clean up.
 */
export function createTestClient(
  serverUrl: string,
  playerId: string,
): Promise<TestClient> {
  return new Promise((resolve, reject) => {
    const client: TestClient = ioClient(serverUrl, {
      auth: { playerId },
      transports: ['websocket'],
      forceNew: true,
      autoConnect: true,
    });

    const timeoutId = setTimeout(() => {
      client.disconnect();
      reject(new Error(`Test client ${playerId} failed to connect within 5s`));
    }, 5_000);

    client.on('connect', () => {
      clearTimeout(timeoutId);
      resolve(client);
    });

    client.on('connect_error', (err) => {
      clearTimeout(timeoutId);
      client.disconnect();
      reject(new Error(`Test client ${playerId} connection error: ${err.message}`));
    });
  });
}

/**
 * Disconnects a test client and waits for the disconnect to complete.
 */
export function disconnectTestClient(client: TestClient): Promise<void> {
  return new Promise((resolve) => {
    if (client.disconnected) {
      resolve();
      return;
    }

    client.on('disconnect', () => {
      resolve();
    });

    client.disconnect();
  });
}
