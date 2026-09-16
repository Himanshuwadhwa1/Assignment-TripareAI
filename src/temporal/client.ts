import { Connection, Client } from '@temporalio/client';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

let clientInstance: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (clientInstance) {
    return clientInstance;
  }

  try {
    const connection = await Connection.connect({
      address: config.temporalAddress,
    });
    clientInstance = new Client({
      connection,
      namespace: config.temporalNamespace,
    });
    logger.info({ address: config.temporalAddress }, 'Connected to Temporal server');
    return clientInstance;
  } catch (err) {
    logger.error({ err, address: config.temporalAddress }, 'Failed to connect to Temporal server');
    throw err;
  }
}
