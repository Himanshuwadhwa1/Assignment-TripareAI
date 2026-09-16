import { proxyActivities, log } from '@temporalio/workflow';
import type * as fetchActivities from './activities/fetch-suppliers.js';
import type * as saveActivities from './activities/save-hotels.js';
import { SupplierHotel, HotelOfferWorkflowInput, HotelOfferWorkflowResult } from '../domain/types.js';
import { mergeOffers } from '../domain/merge-offers.js';

const { fetchSupplierA, fetchSupplierB } = proxyActivities<typeof fetchActivities>({
  startToCloseTimeout: '5s',
  retry: {
    initialInterval: '500ms',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

const { saveHotelsToRedis } = proxyActivities<typeof saveActivities>({
  startToCloseTimeout: '5s',
  retry: {
    initialInterval: '500ms',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export async function hotelOfferWorkflow(
  input: HotelOfferWorkflowInput
): Promise<HotelOfferWorkflowResult> {
  const city = input.city.trim().toLowerCase();
  const failedSuppliers: string[] = [];

  log.info(`hotelOfferWorkflow started for city '${city}'`);

  try {
    const handleA = fetchSupplierA(city);
    const handleB = fetchSupplierB(city);

    const [resA, resB] = await Promise.allSettled([handleA, handleB]);

    let listA: SupplierHotel[] = [];
    if (resA.status === 'fulfilled') {
      listA = resA.value;
    } else {
      const errMsg = resA.reason instanceof Error ? resA.reason.message : String(resA.reason);
      log.error(`fetchSupplierA failed for city '${city}': ${errMsg}`);
      failedSuppliers.push('Supplier A');
    }

    let listB: SupplierHotel[] = [];
    if (resB.status === 'fulfilled') {
      listB = resB.value;
    } else {
      const errMsg = resB.reason instanceof Error ? resB.reason.message : String(resB.reason);
      log.error(`fetchSupplierB failed for city '${city}': ${errMsg}`);
      failedSuppliers.push('Supplier B');
    }

    if (failedSuppliers.length === 2) {
      log.error(`All suppliers failed for city '${city}'`);
      throw new Error(`All suppliers failed for city '${city}'`);
    }

    const merged = mergeOffers(listA, listB);

    // Save merged offers to Redis
    await saveHotelsToRedis(city, merged);

    log.info(
      `hotelOfferWorkflow completed for city '${city}': ${merged.length} hotels found, failedSuppliers=[${failedSuppliers.join(', ')}]`
    );

    return {
      hotels: merged,
      failedSuppliers,
    };
  } catch (err) {
    log.error(`hotelOfferWorkflow error for city '${city}': ${err}`);
    throw err;
  }
}
