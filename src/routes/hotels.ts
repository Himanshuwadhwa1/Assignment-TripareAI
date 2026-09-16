import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { getTemporalClient } from '../temporal/client.js';
import { hotelOfferWorkflow } from '../temporal/workflows.js';

export const hotelsRouter = Router();

hotelsRouter.get('/api/hotels', async (req: Request, res: Response): Promise<void> => {
  const rawCity = req.query.city;

  // 1. Validation: city is required
  if (!rawCity || typeof rawCity !== 'string' || rawCity.trim() === '') {
    res.status(400).json({
      error: 'MISSING_CITY',
      message: "Query parameter 'city' is required",
    });
    return;
  }

  const city = rawCity.trim().toLowerCase();

  // 2. Validation: minPrice / maxPrice range check
  const rawMinPrice = req.query.minPrice;
  const rawMaxPrice = req.query.maxPrice;

  if (rawMinPrice !== undefined || rawMaxPrice !== undefined) {
    if (rawMinPrice === undefined || rawMaxPrice === undefined) {
      res.status(400).json({
        error: 'INVALID_PRICE_RANGE',
        message: 'Both minPrice and maxPrice must be provided',
      });
      return;
    }

    const minPrice = Number(rawMinPrice);
    const maxPrice = Number(rawMaxPrice);

    if (
      typeof rawMinPrice !== 'string' ||
      typeof rawMaxPrice !== 'string' ||
      Number.isNaN(minPrice) ||
      Number.isNaN(maxPrice) ||
      minPrice < 0 ||
      maxPrice < 0
    ) {
      res.status(400).json({
        error: 'INVALID_PRICE',
        message: 'Price must be a valid non-negative number',
      });
      return;
    }

    if (minPrice > maxPrice) {
      res.status(400).json({
        error: 'INVALID_PRICE_RANGE',
        message: 'minPrice must be less than or equal to maxPrice',
      });
      return;
    }
  }

  // 3. Start Temporal workflow
  const workflowId = `hotel-offers-${city}-${uuidv4()}`;

  try {
    const client = await getTemporalClient();

    const handle = await client.workflow.start(hotelOfferWorkflow, {
      args: [{ city }],
      workflowId,
      taskQueue: config.temporalTaskQueue,
    });

    logger.info({ city, workflowId }, 'Started hotelOfferWorkflow');

    const result = await handle.result();

    logger.info(
      { city, workflowId, hotelCount: result.hotels.length, failedSuppliers: result.failedSuppliers },
      'Completed hotelOfferWorkflow'
    );

    // Return bare JSON array per contract
    res.json(result.hotels);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ city, workflowId, err: errMsg }, 'hotelOfferWorkflow failed');

    if (errMsg.includes('All suppliers failed')) {
      res.status(502).json({
        error: 'SUPPLIER_UNAVAILABLE',
        message: `All suppliers failed for city '${city}'`,
      });
      return;
    }

    res.status(503).json({
      error: 'TEMPORAL_UNAVAILABLE',
      message: 'Temporal service unavailable or request timed out',
    });
  }
});
