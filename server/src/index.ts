import express from 'express';
import path from 'path';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { createApp } from './app.js';

const appInstance = createApp({
  corsOrigin: config.corsOrigin,
  cleanupIntervalMs: config.cleanupIntervalMs,
});

// In production, serve Vite-built SPA
if (config.nodeEnv === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  appInstance.expressApp.use(express.static(clientDist));
  appInstance.expressApp.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) {
        logger.error({ err }, 'Failed to serve SPA index.html');
        res.status(503).end();
      }
    });
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    appInstance.stop().finally(() => {
      process.exit(0);
    });
  });
}

appInstance.start(config.port).then((port) => {
  logger.info(`Server listening on port ${port}`);
}).catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
