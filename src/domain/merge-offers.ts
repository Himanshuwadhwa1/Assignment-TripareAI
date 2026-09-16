import { SupplierHotel, HotelOffer } from './types.js';

/**
 * Pure function to merge and deduplicate hotel offers from Supplier A and Supplier B.
 * Deduplicates by normalized hotel name (trimmed, lowercased), keeping the cheapest offer.
 * On exact price ties, Supplier A wins.
 * Results are sorted by price ascending.
 */
export function mergeOffers(
  supplierA: SupplierHotel[],
  supplierB: SupplierHotel[]
): HotelOffer[] {
  const offerMap = new Map<string, HotelOffer>();

  for (const item of supplierA) {
    const key = item.name.trim().toLowerCase();
    const offer: HotelOffer = {
      name: item.name,
      price: item.price,
      supplier: 'Supplier A',
      commissionPct: item.commissionPct,
    };
    const existing = offerMap.get(key);
    if (!existing || item.price < existing.price) {
      offerMap.set(key, offer);
    }
  }

  for (const item of supplierB) {
    const key = item.name.trim().toLowerCase();
    const offer: HotelOffer = {
      name: item.name,
      price: item.price,
      supplier: 'Supplier B',
      commissionPct: item.commissionPct,
    };
    const existing = offerMap.get(key);
    if (!existing) {
      offerMap.set(key, offer);
    } else if (item.price < existing.price) {
      offerMap.set(key, offer);
    }
  }

  const result = Array.from(offerMap.values());
  result.sort((a, b) => a.price - b.price);
  return result;
}
