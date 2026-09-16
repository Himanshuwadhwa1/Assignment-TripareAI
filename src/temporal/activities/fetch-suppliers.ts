import { Context } from '@temporalio/activity';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import { fetchWithTimeout } from '../../lib/http.js';
import { SupplierHotel } from '../../domain/types.js';

export async function fetchSupplierA(city: string): Promise<SupplierHotel[]> {
  const attempt = Context.current().info.attempt;
  const url = `${config.supplierAUrl}?city=${encodeURIComponent(city)}`;
  const startTime = Date.now();

  logger.info({ city, attempt, url }, 'fetchSupplierA started');

  try {
    const res = await fetchWithTimeout(url, config.supplierTimeoutMs);
    const duration = Date.now() - startTime;

    if (!res.ok) {
      throw new Error(`Supplier A returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      throw new Error('Supplier A response body is not an array');
    }

    logger.info(
      { city, attempt, durationMs: duration, count: data.length },
      'fetchSupplierA succeeded'
    );
    return data as SupplierHotel[];
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error(
      {
        city,
        attempt,
        durationMs: duration,
        err: err instanceof Error ? err.message : String(err),
      },
      'fetchSupplierA failed'
    );
    throw err;
  }
}

export async function fetchSupplierB(city: string): Promise<SupplierHotel[]> {
  const attempt = Context.current().info.attempt;
  const url = `${config.supplierBUrl}?city=${encodeURIComponent(city)}`;
  const startTime = Date.now();

  logger.info({ city, attempt, url }, 'fetchSupplierB started');

  try {
    const res = await fetchWithTimeout(url, config.supplierTimeoutMs);
    const duration = Date.now() - startTime;

    if (!res.ok) {
      throw new Error(`Supplier B returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      throw new Error('Supplier B response body is not an array');
    }

    logger.info(
      { city, attempt, durationMs: duration, count: data.length },
      'fetchSupplierB succeeded'
    );
    return data as SupplierHotel[];
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error(
      {
        city,
        attempt,
        durationMs: duration,
        err: err instanceof Error ? err.message : String(err),
      },
      'fetchSupplierB failed'
    );
    throw err;
  }
}
