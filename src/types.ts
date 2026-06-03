export interface ProductDeal {
  title: string;
  price: number;
  merchant: string;
  url: string;
  rating?: string;
  shipping?: string;
  originalPrice?: number;
  discountPercent?: number;
}

export interface ComparisonResult {
  id: string;
  productName: string;
  currency: string;
  deals: ProductDeal[];
  summaryText: string;
  timestamp: string;
  isFallback?: boolean;
}

export interface PriceHistoryEntry {
  timestamp: string; // ISO string or short date
  price: number;
  merchant: string;
}

export interface PriceHistoryRecord {
  productName: string;
  history: PriceHistoryEntry[];
}

export interface AlertThreshold {
  id: string;
  productName: string;
  targetPrice: number;
  email: string;
  isActive: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
}
