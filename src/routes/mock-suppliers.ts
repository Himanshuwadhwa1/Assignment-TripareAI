import { Router, Request, Response } from 'express';
import { supplierAHotels } from '../mocks/supplier-a.data.js';
import { supplierBHotels } from '../mocks/supplier-b.data.js';
import { supplierState } from '../mocks/supplier-state.js';

export const mockSuppliersRouter = Router();

mockSuppliersRouter.get('/supplierA/hotels', (req: Request, res: Response): void => {
  if (supplierState.isSupplierADown()) {
    res.status(503).json({ error: 'SUPPLIER_DOWN', message: 'Supplier A is down' });
    return;
  }
  const city = req.query.city ? String(req.query.city).trim().toLowerCase() : undefined;
  if (city) {
    res.json(supplierAHotels.filter((h) => h.city.toLowerCase() === city));
  } else {
    res.json(supplierAHotels);
  }
});

mockSuppliersRouter.get('/supplierB/hotels', (req: Request, res: Response): void => {
  if (supplierState.isSupplierBDown()) {
    res.status(503).json({ error: 'SUPPLIER_DOWN', message: 'Supplier B is down' });
    return;
  }
  const city = req.query.city ? String(req.query.city).trim().toLowerCase() : undefined;
  if (city) {
    res.json(supplierBHotels.filter((h) => h.city.toLowerCase() === city));
  } else {
    res.json(supplierBHotels);
  }
});

mockSuppliersRouter.post('/mock/suppliers/:supplier/status', (req: Request, res: Response): void => {
  const rawSupplier = req.params.supplier;
  const supplierParam = (typeof rawSupplier === 'string' ? rawSupplier : String(rawSupplier || '')).toLowerCase();
  const { status } = req.body || {};

  if (supplierParam !== 'a' && supplierParam !== 'b') {
    res.status(400).json({ error: 'INVALID_SUPPLIER', message: 'Supplier parameter must be "a" or "b"' });
    return;
  }

  if (status !== 'up' && status !== 'down') {
    res.status(400).json({ error: 'INVALID_STATUS', message: 'Status must be "up" or "down"' });
    return;
  }

  const isDown = status === 'down';
  if (supplierParam === 'a') {
    supplierState.setSupplierADown(isDown);
  } else {
    supplierState.setSupplierBDown(isDown);
  }

  const supplierLabel = supplierParam === 'a' ? 'Supplier A' : 'Supplier B';
  res.json({ supplier: supplierLabel, status });
});
