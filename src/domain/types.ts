export interface SupplierHotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

export interface HotelOffer {
  name: string;
  price: number;
  supplier: "Supplier A" | "Supplier B";
  commissionPct: number;
}

export interface HotelOfferWorkflowInput {
  city: string;
}

export interface HotelOfferWorkflowResult {
  hotels: HotelOffer[];
  failedSuppliers: string[];
}
