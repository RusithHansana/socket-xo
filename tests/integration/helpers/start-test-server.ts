import { createApp, type AppInstance } from '../../../server/src/app';

export type TestServer = {
  app: AppInstance;
  port: number;
  url: string;
};

/**
 * Starts a server on an ephemeral port for integration testing.
 * Returns the server instance with port and URL for client connections.
 * Call `server.app.stop()` in afterAll/afterEach to clean up.
 */
export async function startTestServer(): Promise<TestServer> {
  const app = createApp({
    corsOrigin: '*',
    cleanupIntervalMs: 0, // No background sweep during tests
  });

  const port = await app.start(0); // Ephemeral port

  return {
    app,
    port,
    url: `http://localhost:${port}`,
  };
}
