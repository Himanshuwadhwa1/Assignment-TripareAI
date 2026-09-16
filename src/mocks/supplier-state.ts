import { config } from '../config/index.js';

class SupplierState {
  private supplierADown: boolean;
  private supplierBDown: boolean;

  constructor() {
    this.supplierADown = config.supplierADown;
    this.supplierBDown = config.supplierBDown;
  }

  isSupplierADown(): boolean {
    return this.supplierADown;
  }

  isSupplierBDown(): boolean {
    return this.supplierBDown;
  }

  setSupplierADown(down: boolean): void {
    this.supplierADown = down;
  }

  setSupplierBDown(down: boolean): void {
    this.supplierBDown = down;
  }
}

export const supplierState = new SupplierState();
