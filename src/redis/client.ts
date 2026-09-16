import { createClient, RedisClientType } from 'redis';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

let clientInstance: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (clientInstance && clientInstance.isOpen) {
    return clientInstance;
  }

  if (!clientInstance) {
    clientInstance = createClient({
      url: config.redisUrl,
    });

    clientInstance.on('error', (err) => {
      logger.error({ err, url: config.redisUrl }, 'Redis client error');
    });

    clientInstance.on('connect', () => {
      logger.info({ url: config.redisUrl }, 'Redis client connected');
    });
  }

  if (!clientInstance.isOpen) {
    await clientInstance.connect();
  }

  return clientInstance;
}
