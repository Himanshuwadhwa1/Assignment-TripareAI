import { saveHotels } from '../../redis/hotels-repository.js';
import { HotelOffer } from '../../domain/types.js';
import { logger } from '../../lib/logger.js';

export async function saveHotelsToRedis(city: string, hotels: HotelOffer[]): Promise<void> {
  const startTime = Date.now();
  logger.info({ city, count: hotels.length }, 'saveHotelsToRedis started');

  try {
    await saveHotels(city, hotels);
    const duration = Date.now() - startTime;
    logger.info({ city, durationMs: duration, count: hotels.length }, 'saveHotelsToRedis succeeded');
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error(
      { city, durationMs: duration, err: err instanceof Error ? err.message : String(err) },
      'saveHotelsToRedis failed'
    );
    throw err;
  }
}
