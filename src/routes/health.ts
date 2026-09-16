import { Router, Request, Response } from 'express';
import { config } from '../config/index.js';
import { fetchWithTimeout } from '../lib/http.js';
import { getRedisClient } from '../redis/client.js';
import { getTemporalClient } from '../temporal/client.js';
import { logger } from '../lib/logger.js';

export const healthRouter = Router();

interface ProbeResult {
  status: 'up' | 'down';
  latencyMs: number;
}

async function probeSupplier(url: string): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url, 1000);
    const latencyMs = Date.now() - start;
    if (res.ok) {
      return { status: 'up', latencyMs };
    }
    return { status: 'down', latencyMs };
  } catch {
    const latencyMs = Date.now() - start;
    return { status: 'down', latencyMs };
  }
}

async function probeRedis(): Promise<'up' | 'down'> {
  try {
    const client = await getRedisClient();
    const reply = await client.ping();
    return reply === 'PONG' ? 'up' : 'down';
  } catch (err) {
    logger.error({ err }, 'Health probe Redis failed');
    return 'down';
  }
}

async function probeTemporal(): Promise<'up' | 'down'> {
  try {
    const client = await getTemporalClient();
    await client.workflowService.getSystemInfo({});
    return 'up';
  } catch (err) {
    logger.error({ err }, 'Health probe Temporal failed');
    return 'down';
  }
}

healthRouter.get('/health', async (_req: Request, res: Response): Promise<void> => {
  const [supplierA, supplierB, redisStatus, temporalStatus] = await Promise.all([
    probeSupplier(config.supplierAUrl),
    probeSupplier(config.supplierBUrl),
    probeRedis(),
    probeTemporal(),
  ]);

  const isSupplierAUp = supplierA.status === 'up';
  const isSupplierBUp = supplierB.status === 'up';
  const isRedisUp = redisStatus === 'up';
  const isTemporalUp = temporalStatus === 'up';

  let overallStatus: 'ok' | 'degraded' | 'down';
  let httpStatusCode = 200;

  if (!isRedisUp || !isTemporalUp || (!isSupplierAUp && !isSupplierBUp)) {
    overallStatus = 'down';
    httpStatusCode = 503;
  } else if (!isSupplierAUp || !isSupplierBUp) {
    overallStatus = 'degraded';
    httpStatusCode = 200;
  } else {
    overallStatus = 'ok';
    httpStatusCode = 200;
  }

  res.status(httpStatusCode).json({
    status: overallStatus,
    suppliers: {
      supplierA: { status: supplierA.status, latencyMs: supplierA.latencyMs },
      supplierB: { status: supplierB.status, latencyMs: supplierB.latencyMs },
    },
    dependencies: {
      redis: redisStatus,
      temporal: temporalStatus,
    },
  });
});
