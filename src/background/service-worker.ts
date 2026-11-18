import { parseMessage } from "../shared/messages";
import { db } from "../db/database";
import { evaluateAlerts } from "../core/alerts";
import type { PricePoint } from "../shared/types";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.alarms.create("price-check", { periodInMinutes: 30 });
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.alarms.create("price-check", { periodInMinutes: 30 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "price-check") return;
  const dueItems = await db.items.where("nextCheckAt").belowOrEqual(Date.now()).toArray();
  for (const item of dueItems) {
    await db.items.update(item.id, { nextCheckAt: Date.now() + item.checkIntervalMinutes * 60_000 });
  }
});

chrome.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
  void (async () => {
    try {
      const message = parseMessage(rawMessage);
      if (message.type === "PING") return sendResponse({ ok: true, data: "pong" });
      if (message.type === "LIST_ITEMS") return sendResponse({ ok: true, data: await db.items.toArray() });
      if (message.type === "TRACK_ITEM") {
        await db.items.put(message.item);
        return sendResponse({ ok: true });
      }
      if (message.type === "CAPTURE_PRICE") {
        const { extraction } = message;
        const existing = await db.items.where("productKey").equals(extraction.productKey).first();
        const now = Date.now();
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
          checkIntervalMinutes: 180,
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
                iconUrl: "public/icons/icon.svg",
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
