import { config } from '../config/index.js';

/**
 * Fetch helper using Node 20's built-in fetch with AbortController timeout.
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs: number = config.supplierTimeoutMs
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
