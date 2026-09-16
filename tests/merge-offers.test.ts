import { describe, it, expect } from 'vitest';
import { mergeOffers } from '../src/domain/merge-offers.js';
import { SupplierHotel } from '../src/domain/types.js';

describe('mergeOffers', () => {
  it('prefers B when B is cheaper for the same hotel', () => {
    const listA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Holtin', price: 6000, city: 'delhi', commissionPct: 10 },
    ];
    const listB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Holtin', price: 5340, city: 'delhi', commissionPct: 20 },
    ];

    const result = mergeOffers(listA, listB);

    expect(result).toEqual([
      { name: 'Holtin', price: 5340, supplier: 'Supplier B', commissionPct: 20 },
    ]);
  });

  it('prefers A when A is cheaper for the same hotel', () => {
    const listA: SupplierHotel[] = [
      { hotelId: 'a2', name: 'Radison', price: 5900, city: 'delhi', commissionPct: 13 },
    ];
    const listB: SupplierHotel[] = [
      { hotelId: 'b2', name: 'Radison', price: 6200, city: 'delhi', commissionPct: 11 },
    ];

    const result = mergeOffers(listA, listB);

    expect(result).toEqual([
      { name: 'Radison', price: 5900, supplier: 'Supplier A', commissionPct: 13 },
    ]);
  });

  it('includes hotels present only in A labeled with "Supplier A"', () => {
    const listA: SupplierHotel[] = [
      { hotelId: 'a3', name: 'Taj Palace', price: 8200, city: 'delhi', commissionPct: 15 },
    ];
    const listB: SupplierHotel[] = [];

    const result = mergeOffers(listA, listB);

    expect(result).toEqual([
      { name: 'Taj Palace', price: 8200, supplier: 'Supplier A', commissionPct: 15 },
    ]);
  });

  it('includes hotels present only in B labeled with "Supplier B"', () => {
    const listA: SupplierHotel[] = [];
    const listB: SupplierHotel[] = [
      { hotelId: 'b4', name: 'The Oberoi', price: 9100, city: 'delhi', commissionPct: 18 },
    ];

    const result = mergeOffers(listA, listB);

    expect(result).toEqual([
      { name: 'The Oberoi', price: 9100, supplier: 'Supplier B', commissionPct: 18 },
    ]);
  });

  it('deduplicates name casing and whitespace differences as one hotel', () => {
    const listA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'holtin ', price: 6000, city: 'delhi', commissionPct: 10 },
    ];
    const listB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Holtin', price: 5340, city: 'delhi', commissionPct: 20 },
    ];

    const result = mergeOffers(listA, listB);

    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(5340);
    expect(result[0].supplier).toBe('Supplier B');
  });

  it('defaults to Supplier A on exact price ties', () => {
    const listA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Grand Plaza', price: 5000, city: 'delhi', commissionPct: 12 },
    ];
    const listB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Grand Plaza', price: 5000, city: 'delhi', commissionPct: 15 },
    ];

    const result = mergeOffers(listA, listB);

    expect(result).toEqual([
      { name: 'Grand Plaza', price: 5000, supplier: 'Supplier A', commissionPct: 12 },
    ]);
  });

  it('returns empty array when both input lists are empty', () => {
    expect(mergeOffers([], [])).toEqual([]);
  });

  it('sorts output by price ascending', () => {
    const listA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Expensive Hotel', price: 10000, city: 'delhi', commissionPct: 10 },
      { hotelId: 'a2', name: 'Cheap Hotel', price: 2000, city: 'delhi', commissionPct: 5 },
    ];
    const listB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Mid Hotel', price: 5000, city: 'delhi', commissionPct: 8 },
    ];

    const result = mergeOffers(listA, listB);

    expect(result.map((h) => h.price)).toEqual([2000, 5000, 10000]);
  });

  it('returns objects containing exactly the four required keys and no extra keys', () => {
    const listA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Test Hotel', price: 3000, city: 'delhi', commissionPct: 10 },
    ];
    const result = mergeOffers(listA, []);

    expect(result).toHaveLength(1);
    const keys = Object.keys(result[0]).sort();
    expect(keys).toEqual(['commissionPct', 'name', 'price', 'supplier']);
  });

  it('produces expected output for ARCHITECTURE.md section 5 delhi dataset', () => {
    const delhiA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Holtin', price: 6000, city: 'delhi', commissionPct: 10 },
      { hotelId: 'a2', name: 'Radison', price: 5900, city: 'delhi', commissionPct: 13 },
      { hotelId: 'a3', name: 'Taj Palace', price: 8200, city: 'delhi', commissionPct: 15 },
      { hotelId: 'a4', name: 'Le Meridien', price: 7100, city: 'delhi', commissionPct: 12 },
    ];

    const delhiB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Holtin', price: 5340, city: 'delhi', commissionPct: 20 },
      { hotelId: 'b2', name: 'Radison', price: 6200, city: 'delhi', commissionPct: 11 },
      { hotelId: 'b3', name: 'Le Meridien', price: 7400, city: 'delhi', commissionPct: 9 },
      { hotelId: 'b4', name: 'The Oberoi', price: 9100, city: 'delhi', commissionPct: 18 },
    ];

    const expected = [
      { name: 'Holtin', price: 5340, supplier: 'Supplier B', commissionPct: 20 },
      { name: 'Radison', price: 5900, supplier: 'Supplier A', commissionPct: 13 },
      { name: 'Le Meridien', price: 7100, supplier: 'Supplier A', commissionPct: 12 },
      { name: 'Taj Palace', price: 8200, supplier: 'Supplier A', commissionPct: 15 },
      { name: 'The Oberoi', price: 9100, supplier: 'Supplier B', commissionPct: 18 },
    ];

    expect(mergeOffers(delhiA, delhiB)).toEqual(expected);
  });
});
