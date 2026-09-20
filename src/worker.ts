import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker/worker.module';

/**
 * Background worker entrypoint — no HTTP listener. Processes ingestion jobs
 * (Keepa/CI/Ad Winners) and the waitlist-expiry cron from Redis/BullMQ,
 * decoupled from the web process so a long ingestion never ties up the API.
 * Run alongside the API with `npm run start:worker` (see backend/README or
 * docker-compose.yml's `worker` service).
 */
async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule);
  logger.log('Scout-ly worker listening for jobs (ingestion, waitlist)');

  const shutdown = async (signal: string) => {
    logger.log(`${signal} received — closing worker`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap();
