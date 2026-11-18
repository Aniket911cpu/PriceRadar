import { parsePrice, type ParsedPrice } from "../../core/price";
import { normalizeUrl, productKey } from "../../core/url";

export interface Extraction {
  title: string;
  canonicalUrl: string;
  domain: string;
  imageUrl?: string;
  currentPrice: ParsedPrice;
  listPrice?: ParsedPrice;
  currency: string;
  availability: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  productKey: string;
  method: "jsonld" | "microdata" | "opengraph" | "heuristic";
  confidence: number;
}

function meta(document: Document, name: string): string | undefined {
  return document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.getAttribute("content")?.trim() || undefined;
}

function fromJsonLd(document: Document): Partial<Extraction> | undefined {
  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent ?? "");
      const values = Array.isArray(parsed) ? parsed : [parsed];
      const product = values.find((value) => value?.["@type"] === "Product" || value?.["@type"]?.includes?.("Product"));
      const offer = product?.offers?.[0] ?? product?.offers;
      const price = parsePrice(String(offer?.price ?? offer?.lowPrice ?? ""));
      if (product && price) {
        return {
          title: String(product.name ?? ""),
          imageUrl: typeof product.image === "string" ? product.image : product.image?.url,
          currentPrice: price,
          currency: String(offer?.priceCurrency ?? price.currency),
          availability: String(offer?.availability ?? "").toLowerCase().includes("outofstock") ? "out_of_stock" : "in_stock",
          method: "jsonld",
          confidence: 0.98,
        };
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

function fromMeta(document: Document): Partial<Extraction> | undefined {
  const price = parsePrice(meta(document, "product:price:amount") ?? meta(document, "og:price:amount") ?? "");
  if (!price) return undefined;
  return {
    title: meta(document, "og:title") ?? document.title,
    imageUrl: meta(document, "og:image"),
    currentPrice: price,
    currency: meta(document, "product:price:currency") ?? price.currency,
    availability: "unknown",
    method: "opengraph",
    confidence: 0.85,
  };
}

function fromMicrodata(document: Document): Partial<Extraction> | undefined {
  const price = parsePrice(document.querySelector('[itemprop="price"]')?.getAttribute("content") ?? document.querySelector('[itemprop="price"]')?.textContent ?? "");
  if (!price) return undefined;
  return {
    title: document.querySelector('[itemprop="name"]')?.textContent?.trim() ?? document.title,
    imageUrl: document.querySelector('[itemprop="image"]')?.getAttribute("src") ?? undefined,
    currentPrice: price,
    currency: document.querySelector('[itemprop="priceCurrency"]')?.getAttribute("content") ?? price.currency,
    availability: "unknown",
    method: "microdata",
    confidence: 0.9,
  };
}

function fromHeuristic(document: Document): Partial<Extraction> | undefined {
  const candidates = [...document.querySelectorAll("body *")]
    .filter((element) => element.children.length === 0)
    .map((element) => ({ element, price: parsePrice(element.textContent ?? "") }))
    .filter((candidate): candidate is { element: Element; price: ParsedPrice } => Boolean(candidate.price))
    .sort((a, b) => (b.element.textContent?.length ?? 0) - (a.element.textContent?.length ?? 0));
  const candidate = candidates.find(({ element }) => !element.closest("del,s,samp,[aria-hidden='true']"));
  if (!candidate) return undefined;
  return {
    title: document.querySelector("h1")?.textContent?.trim() ?? document.title,
    currentPrice: candidate.price,
    currency: candidate.price.currency,
    availability: "unknown",
    method: "heuristic",
    confidence: 0.55,
  };
}

export function extractProduct(document: Document, url = document.location.href): Extraction | undefined {
  const partial = fromJsonLd(document) ?? fromMicrodata(document) ?? fromMeta(document) ?? fromHeuristic(document);
  if (!partial?.currentPrice) return undefined;
  const canonicalUrl = normalizeUrl(document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? url);
  const stableId = document.querySelector('[itemprop="sku"], [itemprop="gtin"], [data-product-id]')?.getAttribute("content") ?? undefined;
  return {
    title: (partial.title ?? document.title).slice(0, 500),
    canonicalUrl,
    domain: new URL(canonicalUrl).hostname,
    imageUrl: partial.imageUrl,
    currentPrice: partial.currentPrice,
    listPrice: partial.listPrice,
    currency: partial.currency ?? partial.currentPrice.currency,
    availability: partial.availability ?? "unknown",
    productKey: productKey(canonicalUrl, stableId),
    method: partial.method ?? "heuristic",
    confidence: partial.confidence ?? 0,
  };
}
