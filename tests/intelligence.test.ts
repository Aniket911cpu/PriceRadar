import { describe, expect, it } from "vitest";
import { dealScore, effectivePrice, matchProductTitles } from "../src/core/intelligence";

describe("local intelligence", () => {
  it("scores a current low as a strong deal", () => {
    expect(dealScore([{ id: "1", itemId: "i", ts: 1, price: 100, availability: "in_stock", source: "import", confidence: 1 }, { id: "2", itemId: "i", ts: 2, price: 200, availability: "in_stock", source: "import", confidence: 1 }], 100).score).toBeGreaterThanOrEqual(50);
  });
  it("calculates effective price", () => expect(effectivePrice(1000, [100, 50], 20)).toBe(870));
  it("matches common product tokens", () => expect(matchProductTitles("Apple iPhone 15 128GB", "iPhone 15 128 GB Apple")).toBeGreaterThanOrEqual(0.5));
});
