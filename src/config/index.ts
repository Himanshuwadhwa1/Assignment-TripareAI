import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  temporalAddress: string;
  temporalNamespace: string;
  temporalTaskQueue: string;
  redisUrl: string;
  supplierAUrl: string;
  supplierBUrl: string;
  supplierTimeoutMs: number;
  supplierADown: boolean;
  supplierBDown: boolean;
  hotelsTtlSeconds: number;
  logLevel: string;
}

const parseBoolean = (val: string | undefined, defaultValue: boolean): boolean => {
  if (val === undefined || val === '') return defaultValue;
  return val.toLowerCase() === 'true';
};

const parseNumber = (val: string | undefined, defaultValue: number): number => {
  if (val === undefined || val === '') return defaultValue;
  const parsed = Number(val);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

export const config: Config = {
  port: parseNumber(process.env.PORT, 3000),
  temporalAddress: process.env.TEMPORAL_ADDRESS || 'temporal:7233',
  temporalNamespace: process.env.TEMPORAL_NAMESPACE || 'default',
  temporalTaskQueue: process.env.TEMPORAL_TASK_QUEUE || 'hotel-offers',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  supplierAUrl: process.env.SUPPLIER_A_URL || 'http://api:3000/supplierA/hotels',
  supplierBUrl: process.env.SUPPLIER_B_URL || 'http://api:3000/supplierB/hotels',
  supplierTimeoutMs: parseNumber(process.env.SUPPLIER_TIMEOUT_MS, 3000),
  supplierADown: parseBoolean(process.env.SUPPLIER_A_DOWN, false),
  supplierBDown: parseBoolean(process.env.SUPPLIER_B_DOWN, false),
  hotelsTtlSeconds: parseNumber(process.env.HOTELS_TTL_SECONDS, 300),
  logLevel: process.env.LOG_LEVEL || 'info',
};
