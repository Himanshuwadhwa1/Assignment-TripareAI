import express, { Request, Response, NextFunction } from 'express';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { mockSuppliersRouter } from './routes/mock-suppliers.js';
import { hotelsRouter } from './routes/hotels.js';
import { healthRouter } from './routes/health.js';

export const app = express();

app.use(express.json());

// Structured request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      query: req.query,
      statusCode: res.statusCode,
      durationMs: duration,
    }, 'HTTP Request');
  });
  next();
});

// Wire routes
app.use(mockSuppliersRouter);
app.use(hotelsRouter);
app.use(healthRouter);

// Central error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled request error');
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: err instanceof Error ? err.message : 'An unexpected error occurred',
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    logger.info(`Server started on port ${config.port}`);
  });
}
