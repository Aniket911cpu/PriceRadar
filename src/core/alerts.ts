import type { AlertRule, AlertType, Item, PricePoint } from "../shared/types";

export interface Rule extends Omit<AlertRule, "type" | "params"> {
  type: AlertType;
  params: Record<string, number>;
}

export interface AlertTrigger {
  ruleId: string;
  type: AlertType;
  message: string;
  price: number;
}

function average(points: PricePoint[]): number {
  return points.length ? points.reduce((sum, point) => sum + point.price, 0) / points.length : 0;
}

function minimum(values: number[]): number {
  return values.reduce((lowest, value) => Math.min(lowest, value), Number.POSITIVE_INFINITY);
}

function inCooldown(rule: Rule, now: number): boolean {
  return Boolean(rule.lastFiredAt && now - rule.lastFiredAt < rule.cooldownMin * 60_000);
}

export function evaluateAlerts(item: Item, history: PricePoint[], rules: Rule[], now = Date.now(), dealScore?: number): AlertTrigger[] {
  const current = item.currentPrice;
  if (current === null) return [];
  const sorted = [...history].sort((a, b) => a.ts - b.ts);
  const previous = sorted.at(-1)?.price;
  const triggers: AlertTrigger[] = [];
  for (const rule of rules) {
    if (!rule.enabled || rule.oneShot && rule.lastFiredAt || inCooldown(rule, now)) continue;
    const days = rule.params.days ?? 30;
    const recent = sorted.filter((point) => point.ts >= now - days * 86_400_000);
    const low = recent.length ? minimum(recent.map((point) => point.price)) : sorted.length ? minimum([current, ...sorted.map((point) => point.price)]) : current;
    let fired = false;
    switch (rule.type) {
      case "target_price": fired = current <= (rule.params.target ?? Number.MIN_SAFE_INTEGER); break;
      case "price_range": fired = current >= (rule.params.min ?? Number.MIN_SAFE_INTEGER) && current <= (rule.params.max ?? Number.MAX_SAFE_INTEGER); break;
      case "all_time_low": fired = current <= (sorted.length ? minimum([current, ...sorted.map((point) => point.price)]) : current) && previous !== undefined && current < previous; break;
      case "lowest_n_days": fired = current <= low && previous !== undefined && current < previous; break;
      case "percent_drop": fired = previous !== undefined && ((previous - current) / previous) * 100 >= (rule.params.percent ?? 0); break;
      case "absolute_drop": fired = previous !== undefined && previous - current >= (rule.params.amount ?? Number.MAX_SAFE_INTEGER); break;
      case "back_in_stock": fired = item.availability === "in_stock" && sorted.at(-1)?.availability === "out_of_stock"; break;
      case "price_increase": fired = previous !== undefined && ((current - previous) / previous) * 100 >= (rule.params.percent ?? 0); break;
      case "percentile": {
        const values = sorted.map((point) => point.price).sort((a, b) => a - b);
        const threshold = values[Math.max(0, Math.ceil(values.length * ((rule.params.percent ?? 10) / 100)) - 1)];
        fired = threshold !== undefined && current <= threshold;
        break;
      }
      case "deal_quality": fired = dealScore !== undefined && dealScore >= (rule.params.score ?? 80); break;
      case "flash_sale": fired = previous !== undefined && ((previous - current) / previous) * 100 > 15; break;
      case "effective_price": fired = current <= (rule.params.max ?? Number.MIN_SAFE_INTEGER); break;
    }
    if (fired) triggers.push({ ruleId: rule.id, type: rule.type, message: `${rule.type.replaceAll("_", " ")} alert at ${current}`, price: current });
  }
  return triggers;
}

export function priceAverage(history: PricePoint[]): number {
  return average(history);
}
