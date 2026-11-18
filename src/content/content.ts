import { extractProduct } from "../adapters/generic/extractor";

chrome.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
  if (rawMessage?.type !== "GET_EXTRACTION") return false;
  const extraction = extractProduct(document);
  sendResponse({ ok: true, data: extraction ?? null });
  return false;
});

const extraction = extractProduct(document);
if (extraction) {
  const root = document.createElement("div");
  const shadow = root.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = ":host{all:initial}.card{position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:14px;border:1px solid #d1d5db;border-radius:12px;background:#fff;color:#12312f;font:14px system-ui;box-shadow:0 6px 24px #0002}.price{font-weight:800;font-size:18px}.track{margin-top:8px;padding:8px 12px;border:0;border-radius:8px;background:#0f766e;color:#fff;font-weight:700;cursor:pointer}";
  shadow.append(style);
  const card = document.createElement("div");
  card.className = "card";
  const title = document.createElement("div");
  title.textContent = extraction.title;
  const price = document.createElement("div");
  price.className = "price";
  price.textContent = extraction.currentPrice.raw;
  const button = document.createElement("button");
  button.className = "track";
  button.type = "button";
  button.textContent = "Track this price";
  card.append(title, price, button);
  shadow.append(card);
  button.addEventListener("click", () => {
    void chrome.runtime.sendMessage({ type: "CAPTURE_PRICE", extraction });
  });
  document.documentElement.append(root);
}
