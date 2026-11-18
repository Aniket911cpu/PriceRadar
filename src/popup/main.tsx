import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function Popup() {
  return (
    <main className="popup">
      <header><span className="logo">PriceRadar</span><span className="status">Local-first</span></header>
      <section className="empty">
        <h1>Track prices privately.</h1>
        <p>Open a product page and use the extension to start your first price history.</p>
        <button type="button" onClick={() => void chrome.runtime.sendMessage({ type: "PING" })}>Ready to track</button>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Popup /></StrictMode>);
