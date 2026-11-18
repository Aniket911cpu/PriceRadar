export interface Reading {
  price: number;
  ts: number;
}

export function isSanitySafe(previous: Reading | undefined, next: Reading, confirmations: Reading[] = []): boolean {
  if (!previous || previous.price === 0) return true;
  const deviation = Math.abs(next.price - previous.price) / previous.price;
  if (deviation <= 0.7) return true;
  return confirmations.some((reading) => Math.abs(reading.price - next.price) / next.price <= 0.05);
}

export function nextBackoffMinutes(failureCount: number, base = 30, max = 24 * 60): number {
  return Math.min(max, base * 2 ** Math.max(0, failureCount - 1));
}

export function jitteredDelay(minutes: number, random = Math.random()): number {
  return Math.round(minutes * 60_000 * (0.9 + random * 0.2));
}
