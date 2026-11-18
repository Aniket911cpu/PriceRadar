import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import type { Item } from "../shared/types";

function Popup() {
  const [items, setItems] = React.useState<Item[]>([]);
  React.useEffect(() => {
    void chrome.runtime.sendMessage({ type: "LIST_ITEMS" }).then((response: { ok: boolean; data?: Item[] }) => {
      if (response.ok && response.data) setItems(response.data);
    });
  }, []);
  return (
    <main className="popup">
      <header><span className="logo">PriceRadar</span><span className="status">Local-first</span></header>
      <section className="empty">
        <h1>{items.length ? `${items.length} tracked item${items.length === 1 ? "" : "s"}` : "Track prices privately."}</h1>
        <p>{items.length ? "Your latest tracked products are stored on this device." : "Open a product page and use the extension to start your first price history."}</p>
        {items.map((item) => <article className="item" key={item.id}><strong>{item.title}</strong><span>{item.currentPrice === null ? "Price unavailable" : `${item.currency} ${(item.currentPrice / 100).toFixed(2)}`}</span></article>)}
        <button type="button" onClick={() => void chrome.runtime.sendMessage({ type: "PING" })}>Ready to track</button>
      </section>
    </main>
  );
}

import * as React from "react";
createRoot(document.getElementById("root")!).render(<StrictMode><Popup /></StrictMode>);
