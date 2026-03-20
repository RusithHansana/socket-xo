import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer, type TestServer } from './helpers/start-test-server';
import {
  createTestClient,
  disconnectTestClient,
  type TestClient,
} from './helpers/create-test-client';

describe('Integration smoke test: two clients connect', () => {
  let server: TestServer;
  let client1: TestClient;
  let client2: TestClient;

  beforeAll(async () => {
    server = await startTestServer();
    client1 = await createTestClient(server.url, 'player-1');
    client2 = await createTestClient(server.url, 'player-2');
  });

  afterAll(async () => {
    await disconnectTestClient(client1);
    await disconnectTestClient(client2);
    await server.app.stop();
  });

  it('both clients are connected', () => {
    expect(client1.connected).toBe(true);
    expect(client2.connected).toBe(true);
  });

  it('clients have distinct socket IDs', () => {
    expect(client1.id).toBeDefined();
    expect(client2.id).toBeDefined();
    expect(client1.id).not.toBe(client2.id);
  });

  it('client can join the matchmaking queue and receive acknowledgement', async () => {
    const queueJoined = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for queue_joined')), 5_000);
      client1.on('queue_joined', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    client1.emit('join_queue');
    await queueJoined;
  });
});
