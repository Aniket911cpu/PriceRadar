import { describe, expect, it } from "vitest";
import { parsePrice } from "../src/core/price";
import { normalizeUrl } from "../src/core/url";

describe("price parsing", () => {
  it("handles Indian grouping", () => expect(parsePrice("₹1,29,999")?.minorUnits).toBe(12999900));
  it("handles decimal comma", () => expect(parsePrice("1.299,00 €")?.minorUnits).toBe(129900));
  it("handles yen without minor units", () => expect(parsePrice("¥1,299")?.minorUnits).toBe(1299));
});

describe("URL normalization", () => {
  it("removes tracking parameters and hashes", () => {
    expect(normalizeUrl("https://example.com/p?utm_source=x&variant=red#reviews")).toBe("https://example.com/p?variant=red");
  });
});
