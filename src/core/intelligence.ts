import type { PricePoint } from "../shared/types";

export type DealLabel = "Great deal" | "Good" | "Fair" | "Wait";

export interface DealScore {
  score: number;
  label: DealLabel;
  percentile: number;
}

export function dealScore(history: PricePoint[], current: number): DealScore {
  const prices = history.map((point) => point.price).filter((price) => price > 0).sort((a, b) => a - b);
  if (!prices.length) return { score: 50, label: "Fair", percentile: 50 };
  const rank = prices.filter((price) => price <= current).length;
  const percentile = Math.round((rank / prices.length) * 100);
  const score = Math.max(0, Math.min(100, Math.round(100 - percentile)));
  const label = score >= 80 ? "Great deal" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Wait";
  return { score, label, percentile };
}

export function effectivePrice(price: number, discounts: number[], shipping = 0): number {
  return Math.max(0, price - discounts.reduce((sum, discount) => sum + Math.max(0, discount), 0) + Math.max(0, shipping));
}

export function detectFakeDiscount(current: number, listPrice: number | undefined, history: PricePoint[]): boolean {
  if (!listPrice || listPrice <= current || history.length < 3) return false;
  const sorted = history.map((point) => point.price).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return current >= median * 0.9;
}

export function matchProductTitles(left: string, right: string): number {
  const tokenize = (value: string) => new Set(value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((token) => token.length > 1));
  const a = tokenize(left);
  const b = tokenize(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / new Set([...a, ...b]).size;
}
