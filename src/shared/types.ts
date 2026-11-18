export type Availability = "in_stock" | "out_of_stock" | "preorder" | "unknown";
export type ItemStatus = "active" | "paused" | "blocked" | "achieved" | "archived";
export type Priority = "high" | "normal" | "low";

export interface Item {
  id: string;
  productKey: string;
  url: string;
  canonicalUrl: string;
  domain: string;
  title: string;
  currency: string;
  currentPrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  availability: Availability;
  status: ItemStatus;
  priority: Priority;
  checkIntervalMinutes: number;
  tags: string[];
  createdAt: number;
  lastCheckedAt?: number;
  nextCheckAt?: number;
  failureCount: number;
}

export interface PricePoint {
  id: string;
  itemId: string;
  ts: number;
  price: number;
  listPrice?: number;
  availability: Availability;
  source: "passive" | "fetch" | "tab" | "import";
  confidence: number;
}

export interface AlertRule {
  id: string;
  itemId: string;
  type: "target_price" | "price_range" | "all_time_low";
  params: Record<string, number>;
  oneShot: boolean;
  cooldownMin: number;
  enabled: boolean;
  lastFiredAt?: number;
  lastFiredPrice?: number;
}

export interface AlertEvent {
  id: string;
  itemId: string;
  ruleId: string;
  ts: number;
  price: number;
  message: string;
  read: boolean;
}
