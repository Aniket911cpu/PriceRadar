import { parseMessage } from "../shared/messages";
import { db } from "../db/database";
import { evaluateAlerts } from "../core/alerts";
import type { Item, PricePoint } from "../shared/types";

interface HistoryPoint {
  ts: number;
  price: number;
  currency?: string;
  source?: "api" | "passive" | "fetch";
  minorUnits?: boolean;
}

function extractAsin(url: string): string | undefined {
  return url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)?.[1]?.toUpperCase();
}

async function fetchKeepaHistory(url: string): Promise<HistoryPoint[] | null> {
  const settings = await chrome.storage.local.get(["keepaApiKey"]);
  const apiKey = typeof settings.keepaApiKey === "string" ? settings.keepaApiKey.trim() : "";
  if (!apiKey) return null;
  const hostname = new URL(url).hostname.toLowerCase();
  const domains: Record<string, number> = {
    "amazon.com": 1, "amazon.co.uk": 2, "amazon.de": 3, "amazon.fr": 4,
    "amazon.in": 5, "amazon.ca": 6, "amazon.it": 8, "amazon.es": 9,
  };
  const domain = domains[hostname];
  const asin = extractAsin(url);
  if (!domain || !asin) return null;
  const response = await fetch(`https://api.keepa.com/product?key=${encodeURIComponent(apiKey)}&domain=${domain}&asin=${asin}&history=1&stats=1`, { credentials: "omit" });
  if (!response.ok) throw new Error(`Price history API returned ${response.status}`);
  const payload = await response.json() as { products?: Array<{ csv?: number[][] }> };
  const amazonSeries = payload.products?.[0]?.csv?.[0];
  if (!amazonSeries) return null;
  const points: HistoryPoint[] = [];
  for (let index = 0; index + 1 < amazonSeries.length; index += 2) {
    const keepaMinutes = amazonSeries[index];
    const keepaPrice = amazonSeries[index + 1];
    if (keepaMinutes >= 0 && keepaPrice >= 0) {
      points.push({
        ts: (keepaMinutes + 21564000) * 60_000,
        price: keepaPrice,
        currency: hostname === "amazon.in" ? "INR" : "USD",
        source: "api",
        minorUnits: true,
      });
    }
  }
  return points;
}

async function fetchGenericHistory(url: string, title: string): Promise<HistoryPoint[] | null> {
  const settings = await chrome.storage.local.get(["priceHistoryEndpoint"]);
  const endpoint = typeof settings.priceHistoryEndpoint === "string" ? settings.priceHistoryEndpoint.trim() : "";
  if (!endpoint) return null;
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, title }),
  });
  if (!response.ok) throw new Error(`Price history API returned ${response.status}`);
  const payload = await response.json() as { points?: HistoryPoint[] };
  if (!Array.isArray(payload.points)) return null;
  return payload.points
    .filter((point) => Number.isFinite(point.ts) && Number.isFinite(point.price) && point.price > 0)
    .map((point) => ({ ...point, source: "api" }));
}

async function fetchPriceHistory(url: string, title: string): Promise<HistoryPoint[]> {
  try {
    const keepa = await fetchKeepaHistory(url);
    if (keepa?.length) return keepa;
  } catch (error) {
    void error;
  }
  try {
    const generic = await fetchGenericHistory(url, title);
    if (generic?.length) return generic;
  } catch (error) {
    void error;
  }
  return [];
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.alarms.create("price-check", { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.alarms.create("price-check", { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "price-check") return;
  const state = await chrome.storage.local.get("paused");
  if (state.paused) return;
  const dueItems = await db.items.where("nextCheckAt").belowOrEqual(Date.now()).toArray();
  for (const item of dueItems) {
    try {
      const permission = await chrome.permissions.contains({ origins: [`${new URL(item.url).protocol}//${new URL(item.url).host}/*`] });
      if (!permission) {
        await db.items.update(item.id, { status: "paused", failureCount: item.failureCount + 1, nextCheckAt: Date.now() + item.checkIntervalMinutes * 60_000, lastErrorCode: "permission_required" } as never);
        continue;
      }
      const response = await fetch(item.url, { credentials: "omit", redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const scripts = [...html.matchAll(/"price"\s*:\s*"?([0-9][0-9,.]*)"?/gi)];
      const parsed = scripts.length ? Number(scripts[0][1].replace(/[,.]/g, "")) : NaN;
      if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("No price found");
      const previous = item.currentPrice;
      if (previous !== null && Math.abs(parsed * 100 - previous) / previous > 0.7) throw new Error("Sanity filter rejected price");
      const now = Date.now();
      await db.items.update(item.id, {
        currentPrice: parsed * 100,
        lowestPrice: item.lowestPrice === null ? parsed * 100 : Math.min(item.lowestPrice, parsed * 100),
        highestPrice: item.highestPrice === null ? parsed * 100 : Math.max(item.highestPrice, parsed * 100),
        lastCheckedAt: now,
        nextCheckAt: now + item.checkIntervalMinutes * 60_000,
        failureCount: 0,
      });
      await db.pricePoints.put({
        id: crypto.randomUUID(),
        itemId: item.id,
        ts: now,
        price: parsed * 100,
        availability: item.availability,
        source: "fetch",
        confidence: 0.75,
      });
    } catch (error) {
      await db.items.update(item.id, {
        status: "blocked",
        failureCount: item.failureCount + 1,
        lastErrorCode: error instanceof Error ? error.message : "check_failed",
        nextCheckAt: Date.now() + item.checkIntervalMinutes * 2 * 60_000,
      });
    }
  }
});

chrome.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
  void (async () => {
    try {
      const message = parseMessage(rawMessage);
      if (message.type === "PING") return sendResponse({ ok: true, data: "pong" });
      if (message.type === "LIST_ITEMS") return sendResponse({ ok: true, data: await db.items.toArray() });
      if (message.type === "GET_NOTIFICATIONS") return sendResponse({ ok: true, data: await db.alertEvents.toArray() });
      if (message.type === "UPDATE_ITEM") {
        const changes: Partial<Item> = {};
        if (message.title) changes.title = message.title;
        if (message.status) changes.status = message.status;
        await db.items.update(message.itemId, changes);
        return sendResponse({ ok: true });
      }
      if (message.type === "DELETE_ITEM") {
        await db.items.delete(message.itemId);
        await db.pricePoints.where("itemId").equals(message.itemId).delete();
        await db.alertRules.where("itemId").equals(message.itemId).delete();
        await db.alertEvents.where("itemId").equals(message.itemId).delete();
        return sendResponse({ ok: true });
      }
      if (message.type === "GET_PRICE_HISTORY") {
        if (message.itemId) {
          const points = await db.pricePoints.where("itemId").equals(message.itemId).sortBy("ts");
          return sendResponse({ ok: true, data: points });
        }
        if (message.url) {
          const points = await fetchPriceHistory(message.url, "Tracked product");
          return sendResponse({ ok: true, data: points });
        }
        return sendResponse({ ok: true, data: [] });
      }
      if (message.type === "MARK_NOTIFICATIONS_READ") {
        await db.alertEvents.toCollection().modify({ read: true });
        await chrome.action.setBadgeText({ text: "" });
        return sendResponse({ ok: true });
      }
      if (message.type === "GET_PAUSED") {
        const state = await chrome.storage.local.get("paused");
        return sendResponse({ ok: true, data: Boolean(state.paused) });
      }
      if (message.type === "SET_PAUSED") {
        await chrome.storage.local.set({ paused: message.paused });
        return sendResponse({ ok: true });
      }
      if (message.type === "CREATE_ALERT") {
        const existing = await db.items.get(message.itemId);
        if (!existing) throw new Error("Tracked item not found");
        const target = message.target ?? existing.currentPrice ?? 0;
        await db.alertRules.add({
          id: crypto.randomUUID(),
          itemId: message.itemId,
          type: message.mode === "target_price" || message.mode === "all_time_low" ? message.mode : message.mode === "any_drop" ? "percent_drop" : "price_range",
          params: message.mode === "target_price"
            ? { target }
            : message.mode === "any_drop"
              ? { percent: 5 }
              : message.mode === "price_range"
                ? { min: 0, max: target }
                : {},
          oneShot: false,
          cooldownMin: 720,
          enabled: true,
        });
        return sendResponse({ ok: true });
      }
      if (message.type === "TRACK_ITEM") {
        await db.items.put(message.item);
        return sendResponse({ ok: true });
      }
      if (message.type === "CAPTURE_PRICE") {
        const { extraction } = message;
        const existing = await db.items.where("productKey").equals(extraction.productKey).first();
        const now = Date.now();
        const settings = await chrome.storage.local.get(["checkIntervalMinutes"]);
        const checkIntervalMinutes = typeof settings.checkIntervalMinutes === "number"
          ? settings.checkIntervalMinutes
          : 90;
        const item = existing ?? {
          id: crypto.randomUUID(),
          productKey: extraction.productKey,
          url: extraction.canonicalUrl,
          canonicalUrl: extraction.canonicalUrl,
          domain: extraction.domain,
          title: extraction.title,
          currency: extraction.currency,
          currentPrice: extraction.currentPrice.minorUnits,
          lowestPrice: extraction.currentPrice.minorUnits,
          highestPrice: extraction.currentPrice.minorUnits,
          availability: extraction.availability,
          status: "active" as const,
          priority: "normal" as const,
          checkIntervalMinutes,
          tags: [],
          createdAt: now,
          failureCount: 0,
        };
        await db.items.put({
          ...item,
          title: extraction.title,
          currentPrice: extraction.currentPrice.minorUnits,
          lowestPrice: item.lowestPrice === null ? extraction.currentPrice.minorUnits : Math.min(item.lowestPrice, extraction.currentPrice.minorUnits),
          highestPrice: item.highestPrice === null ? extraction.currentPrice.minorUnits : Math.max(item.highestPrice, extraction.currentPrice.minorUnits),
          availability: extraction.availability,
          lastCheckedAt: now,
          nextCheckAt: now + item.checkIntervalMinutes * 60_000,
        });
        const point: PricePoint = {
          id: crypto.randomUUID(),
          itemId: item.id,
          ts: now,
          price: extraction.currentPrice.minorUnits,
          availability: extraction.availability,
          source: "passive",
          confidence: extraction.confidence,
        };
        await db.pricePoints.put(point);
        void fetchPriceHistory(extraction.canonicalUrl, extraction.title).then(async (history) => {
          for (const historyPoint of history) {
            const existingPoint = await db.pricePoints.where("itemId").equals(item.id).and((candidate) => candidate.ts === historyPoint.ts).first();
            if (existingPoint) continue;
            await db.pricePoints.put({
              id: crypto.randomUUID(),
              itemId: item.id,
              ts: historyPoint.ts,
              price: historyPoint.price,
              availability: "unknown",
              source: "import",
              confidence: 0.9,
            });
          }
        });
        const rules = await db.alertRules.where("itemId").equals(item.id).toArray();
        const triggers = evaluateAlerts(item, await db.pricePoints.where("itemId").equals(item.id).toArray(), rules);
        for (const trigger of triggers) {
          await db.alertEvents.put({
            id: crypto.randomUUID(),
            itemId: item.id,
            ruleId: trigger.ruleId,
            ts: now,
            price: trigger.price,
            message: trigger.message,
            read: false,
          });
        }
        if (triggers.length) {
          const unreadCount = await db.alertEvents.filter((event) => !event.read).count();
          await chrome.action.setBadgeText({ text: String(unreadCount || triggers.length) });
          await chrome.action.setBadgeBackgroundColor({ color: "#0f766e" });
          for (const trigger of triggers) {
            try {
              await chrome.notifications.create(`alert-${crypto.randomUUID()}`, {
                type: "basic",
                iconUrl: "public/icons/icon128.png",
                title: "PriceRadar alert",
                message: trigger.message,
              });
            } catch {
              // Badge and in-extension event remain available when OS notifications are unavailable.
            }
          }
        }
        return sendResponse({ ok: true, data: item.id });
      }
      return sendResponse({ ok: true, data: null });
    } catch (error) {
      return sendResponse({ ok: false, error: error instanceof Error ? error.message : "Invalid message" });
    }
  })();
  return true;
});
