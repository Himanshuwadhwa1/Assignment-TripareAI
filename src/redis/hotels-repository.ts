import { getRedisClient } from './client.js';
import { config } from '../config/index.js';
import { HotelOffer } from '../domain/types.js';
import { logger } from '../lib/logger.js';

/**
 * Saves deduplicated hotel offers for a city to Redis.
 * Uses a MULTI transaction:
 * - ZADD to hotels:{city} with price as score and normalized name as member
 * - HSET to hotels:{city}:data with normalized name as field and JSON HotelOffer as value
 * - EXPIRE of HOTELS_TTL_SECONDS on both keys
 */
export async function saveHotels(city: string, hotels: HotelOffer[]): Promise<void> {
  const client = await getRedisClient();
  const normalizedCity = city.trim().toLowerCase();
  const zsetKey = `hotels:${normalizedCity}`;
  const hashKey = `hotels:${normalizedCity}:data`;
  const ttl = config.hotelsTtlSeconds;

  const multi = client.multi();

  multi.del(zsetKey);
  multi.del(hashKey);

  if (hotels.length > 0) {
    const zAddItems = hotels.map((h) => ({
      score: h.price,
      value: h.name.trim().toLowerCase(),
    }));
    multi.zAdd(zsetKey, zAddItems);

    for (const h of hotels) {
      const member = h.name.trim().toLowerCase();
      multi.hSet(hashKey, member, JSON.stringify(h));
    }

    multi.expire(zsetKey, ttl);
    multi.expire(hashKey, ttl);
  }

  await multi.exec();
  logger.info({ city: normalizedCity, count: hotels.length, ttl }, 'Saved hotels to Redis via MULTI');
}

/**
 * Performs price filtering inside Redis using ZRANGEBYSCORE.
 * Hydrates results using HMGET on the hash key.
 * Never filters in JavaScript.
 */
export async function findByPriceRange(
  city: string,
  minPrice: number,
  maxPrice: number
): Promise<HotelOffer[]> {
  const client = await getRedisClient();
  const normalizedCity = city.trim().toLowerCase();
  const zsetKey = `hotels:${normalizedCity}`;
  const hashKey = `hotels:${normalizedCity}:data`;

  // 1. ZRANGEBYSCORE returns members in ascending score (price) order
  const members = await client.zRangeByScore(zsetKey, minPrice, maxPrice);

  // Return [] immediately if ZSET returns no members (prevents HMGET with empty list)
  if (!members || members.length === 0) {
    return [];
  }

  // 2. HMGET to hydrate HotelOffer objects
  const jsonStrings = await client.hmGet(hashKey, members);

  const offers: HotelOffer[] = [];
  for (const str of jsonStrings) {
    if (str) {
      offers.push(JSON.parse(str) as HotelOffer);
    }
  }

  logger.info(
    { city: normalizedCity, minPrice, maxPrice, count: offers.length },
    'Fetched price-filtered hotels from Redis'
  );

  return offers;
}
