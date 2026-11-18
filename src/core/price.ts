export interface ParsedPrice {
  minorUnits: number;
  currency: string;
  raw: string;
}

const currencyPatterns: Array<[RegExp, string]> = [
  [/₹|Rs\.?|INR/i, "INR"],
  [/\$|USD/i, "USD"],
  [/€|EUR/i, "EUR"],
  [/£|GBP/i, "GBP"],
  [/¥|￥|JPY/i, "JPY"],
];

function currencyFor(text: string, fallback = "INR"): string {
  return currencyPatterns.find(([pattern]) => pattern.test(text))?.[1] ?? fallback;
}

function normalizeNumber(value: string, currency: string): number | undefined {
  let numeric = value.replace(/[^\d.,]/g, "");
  if (!numeric) return undefined;
  const lastComma = numeric.lastIndexOf(",");
  const lastDot = numeric.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalIndex = Math.max(lastComma, lastDot);
    const decimals = numeric.length - decimalIndex - 1;
    numeric = decimals <= 2
      ? numeric.slice(0, decimalIndex).replace(/[.,]/g, "") + "." + numeric.slice(decimalIndex + 1)
      : numeric.replace(/[.,]/g, "");
  } else if (lastComma >= 0) {
    const decimals = numeric.length - lastComma - 1;
    numeric = decimals <= 2 ? numeric.replace(",", ".") : numeric.replace(/,/g, "");
  } else if (lastDot >= 0) {
    const decimals = numeric.length - lastDot - 1;
    numeric = decimals <= 2 ? numeric.replace(/,/g, "") : numeric.replace(/\./g, "");
  }
  const parsed = Number(numeric);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * (currency === "JPY" ? 1 : 100));
}

export function parsePrice(text: string, fallbackCurrency = "INR"): ParsedPrice | undefined {
  const raw = text.trim();
  const match = raw.match(/(?:₹|Rs\.?|INR|\$|USD|€|EUR|£|GBP|¥|￥|JPY)?\s*\d[\d.,]*(?:\s*(?:lakh|lac|crore))?/i);
  if (!match) return undefined;
  const candidate = match[0];
  const currency = currencyFor(candidate, fallbackCurrency);
  const multiplier = /crore/i.test(candidate) ? 10_000_000 : /lakh|lac/i.test(candidate) ? 100_000 : 1;
  const number = normalizeNumber(candidate, currency);
  if (number === undefined) return undefined;
  return { minorUnits: Math.round(number * multiplier), currency, raw: candidate };
}

export function parsePriceRange(text: string, fallbackCurrency = "INR"): ParsedPrice | undefined {
  const candidates = text.split(/\s*(?:-|–|—|to)\s*/i).map((part) => parsePrice(part, fallbackCurrency)).filter(Boolean) as ParsedPrice[];
  return candidates[0];
}
