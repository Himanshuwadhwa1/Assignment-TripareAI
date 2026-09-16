import { fileURLToPath } from 'node:url';
import { Worker, NativeConnection } from '@temporalio/worker';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';
import * as fetchActivities from './activities/fetch-suppliers.js';
import * as saveActivities from './activities/save-hotels.js';

async function runWorker() {
  const connection = await NativeConnection.connect({
    address: config.temporalAddress,
  });

  const workflowsPath = fileURLToPath(new URL('./workflows.js', import.meta.url));

  const worker = await Worker.create({
    connection,
    namespace: config.temporalNamespace,
    taskQueue: config.temporalTaskQueue,
    workflowsPath,
    activities: {
      ...fetchActivities,
      ...saveActivities,
    },
  });

  logger.info(
    {
      taskQueue: config.temporalTaskQueue,
      temporalAddress: config.temporalAddress,
      namespace: config.temporalNamespace,
    },
    'Temporal Worker started'
  );

  await worker.run();
}

runWorker().catch((err) => {
  logger.error({ err }, 'Worker process error');
  process.exit(1);
});
