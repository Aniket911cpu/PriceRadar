import { describe, expect, it } from "vitest";
import { evaluateAlerts, type Rule } from "../src/core/alerts";
import type { Item, PricePoint } from "../src/shared/types";

const item: Item = {
  id: "item", productKey: "example:item", url: "https://example.com/p", canonicalUrl: "https://example.com/p",
  domain: "example.com", title: "Phone", currency: "INR", currentPrice: 9000, lowestPrice: 9000, highestPrice: 10000,
  availability: "in_stock", status: "active", priority: "normal", checkIntervalMinutes: 180, tags: [], createdAt: 1, failureCount: 0,
};
const history: PricePoint[] = [{ id: "old", itemId: "item", ts: 1, price: 10000, availability: "in_stock", source: "passive", confidence: 1 }];
const rule = (type: Rule["type"], params: Record<string, number>): Rule => ({ id: type, itemId: "item", type, params, oneShot: false, cooldownMin: 0, enabled: true });

describe("alert evaluation", () => {
  it("fires target and drop alerts", () => {
    expect(evaluateAlerts(item, history, [rule("target_price", { target: 9000 }), rule("percent_drop", { percent: 5 })])).toHaveLength(2);
  });
  it("does not fire a one-shot rule twice", () => {
    expect(evaluateAlerts(item, history, [{ ...rule("target_price", { target: 9000 }), oneShot: true, lastFiredAt: 1 }])).toHaveLength(0);
  });
});
