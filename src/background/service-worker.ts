import { parseMessage } from "../shared/messages";
import { db } from "../db/database";

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
      return sendResponse({ ok: true, data: null });
    } catch (error) {
      return sendResponse({ ok: false, error: error instanceof Error ? error.message : "Invalid message" });
    }
  })();
  return true;
});
