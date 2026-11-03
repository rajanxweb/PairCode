import dotenv from 'dotenv';
dotenv.config();
import { ExecutionWorker } from './worker.js';

const worker = new ExecutionWorker();

process.on('SIGINT', () => {
  console.log('[Worker] Received SIGINT signal. Initiating graceful shutdown...');
  worker.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Worker] Received SIGTERM signal. Initiating graceful shutdown...');
  worker.stop();
  process.exit(0);
});

worker.start().catch((err) => {
  console.error('[Worker] Fatal worker error:', err);
  process.exit(1);
});
