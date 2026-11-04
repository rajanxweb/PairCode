import dotenv from 'dotenv';
dotenv.config();
import { createRealtimeServer } from './server.js';

const { server, port } = createRealtimeServer();

server
  .listen()
  .then(() => {
    console.log(`[Realtime] Hocuspocus collaboration server running on port ${port}`);
  })
  .catch((err) => {
    console.error('[Realtime] Failed to start collaboration server:', err);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  console.log('[Realtime] SIGINT received. Shutting down...');
  await server.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Realtime] SIGTERM received. Shutting down...');
  await server.destroy();
  process.exit(0);
});
