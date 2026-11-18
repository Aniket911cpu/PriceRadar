import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, ChartNoAxesCombined, LayoutGrid, List, Search, Settings, Pencil, Pause, Play, Trash2 } from "lucide-react";
import "../ui/tokens.css";
import "./styles.css";
import type { AlertEvent, Item } from "../shared/types";

function formatMinorUnits(minorUnits: number | null, currency = "INR"): string {
  if (minorUnits === null) return "Price unavailable";
  const divisor = currency === "JPY" ? 1 : 100;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: currency === "JPY" ? 0 : 2 }).format(minorUnits / divisor);
}

function SidePanel() {
  const [products, setProducts] = useState<Item[]>([]);
  const [notifications, setNotifications] = useState<AlertEvent[]>([]);
  const [nav, setNav] = useState<"Dashboard" | "Notifications" | "Savings">("Dashboard");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [deletedProduct, setDeletedProduct] = useState<Item | null>(null);

  useEffect(() => {
    void chrome.runtime.sendMessage({ type: "LIST_ITEMS" }).then((response: { ok: boolean; data?: Item[] }) => {
      if (response.ok && response.data) setProducts(response.data);
      setLoading(false);
    });
    void chrome.runtime.sendMessage({ type: "GET_NOTIFICATIONS" }).then((response: { ok: boolean; data?: AlertEvent[] }) => {
      if (response.ok && response.data) setNotifications(response.data);
    });
  }, []);

  const filtered = useMemo(
    () => products.filter((product) => product.title.toLowerCase().includes(query.toLowerCase()) || product.domain.includes(query.toLowerCase())),
    [products, query],
  );
  const selectedProduct = products.find((product) => product.id === selected);
  const openNotifications = async () => {
    setNav("Notifications");
    setNotifications((current) => current.map((entry) => ({ ...entry, read: true })));
    await chrome.runtime.sendMessage({ type: "MARK_NOTIFICATIONS_READ" });
  };
  const updateProduct = async (itemId: string, changes: { title?: string; status?: Item["status"] }) => {
    await chrome.runtime.sendMessage({ type: "UPDATE_ITEM", itemId, ...changes });
    setProducts((current) => current.map((item) => item.id === itemId ? { ...item, ...changes } : item));
  };
  const deleteProduct = async (product: Item) => {
    setDeletedProduct(product);
    await chrome.runtime.sendMessage({ type: "DELETE_ITEM", itemId: product.id });
    setProducts((current) => current.filter((item) => item.id !== product.id));
    setSelected(null);
  };
  const undoDelete = async () => {
    if (!deletedProduct) return;
    await chrome.runtime.sendMessage({ type: "TRACK_ITEM", item: deletedProduct });
    setProducts((current) => [deletedProduct, ...current]);
    setDeletedProduct(null);
  };

  return (
    <main className="dashboard">
      <aside className="nav">
        <div className="brand"><img className="brandMark" src={chrome.runtime.getURL("public/icons/icon32.png")} alt="" /><strong>PriceRadar</strong></div>
        <nav>
          <button className={nav === "Dashboard" ? "active" : ""} onClick={() => setNav("Dashboard")}><LayoutGrid/>Dashboard</button>
          <button className={nav === "Notifications" ? "active" : ""} onClick={() => void openNotifications()}><Bell/>Notifications {notifications.some((entry) => !entry.read) && <b>{notifications.filter((entry) => !entry.read).length}</b>}</button>
          <button className={nav === "Savings" ? "active" : ""} onClick={() => setNav("Savings")}><ChartNoAxesCombined/>Savings</button>
        </nav>
        <button className="settings" onClick={() => chrome.runtime.openOptionsPage()}><Settings/>Settings</button>
      </aside>
      <section className="content">
        {nav === "Notifications" ? (
          <>
            <header className="topbar"><h1>Notifications</h1></header>
            <div className="notificationCenter">
              {notifications.length ? notifications.map((entry) => (
                <article className="notificationEntry" key={entry.id}>
                  <Bell/>
                  <div><strong>{entry.message}</strong><small>{new Date(entry.ts).toLocaleString()}</small></div>
                  <button onClick={() => { const product = products.find((item) => item.id === entry.itemId); if (product) void chrome.tabs.create({ url: product.url }); }}>Open</button>
                </article>
              )) : <div className="emptyState"><h2>No notifications</h2><p>Price alerts will appear here.</p></div>}
            </div>
          </>
        ) : nav === "Savings" ? (
          <><header className="topbar"><h1>Savings</h1></header><div className="emptyState"><h2>No purchases recorded</h2><p>Mark a tracked item as bought to start your savings history.</p></div></>
        ) : (
          <>
            <header className="topbar"><label className="search"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tracked items"/></label></header>
            <div className="kpis"><article><span>Tracked</span><strong>{products.length}</strong></article><article><span>Dropped today</span><strong>0</strong></article><article><span>Near target</span><strong>{products.filter((item) => item.status === "active").length}</strong></article><article><span>Lifetime savings</span><strong>₹0</strong></article></div>
            <div className="sectionTitle"><div><span className="eyebrow">TRACKED ITEMS</span><h1>Good prices, ranked</h1></div><div className="viewButtons"><button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><LayoutGrid/></button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view"><List/></button></div></div>
            {loading ? <div className="emptyState"><p>Loading tracked items…</p></div> : filtered.length ? (
              <div className={`productGrid ${view}`}>{filtered.map((product) => (
                <article className="dealCard" key={product.id} onClick={() => setSelected(product.id)}>
                  <div className="dealTop"><div className="dealImage">{product.title.slice(0, 1)}</div><div className="score"><span>{product.status === "active" ? "A" : "P"}</span></div></div>
                  <span className="retailer">{product.domain}</span>
                  {editingId === product.id ? (
                    <div className="renameRow" onClick={(event) => event.stopPropagation()}><input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} aria-label="Product name"/><button type="button" onClick={() => { void updateProduct(product.id, { title: draftTitle.trim() }); setEditingId(null); }}>Save</button></div>
                  ) : <h2>{product.title}</h2>}
                  <div className="dealPrice"><strong>{formatMinorUnits(product.currentPrice, product.currency)}</strong></div>
                  <div className="cardActions" onClick={(event) => event.stopPropagation()}>
                    <button type="button" aria-label={`Rename ${product.title}`} onClick={() => { setEditingId(product.id); setDraftTitle(product.title); }}><Pencil/></button>
                    <button type="button" aria-label={product.status === "paused" ? `Resume ${product.title}` : `Pause ${product.title}`} onClick={() => void updateProduct(product.id, { status: product.status === "paused" ? "active" : "paused" })}>{product.status === "paused" ? <Play/> : <Pause/>}</button>
                    <button type="button" aria-label={`Delete ${product.title}`} onClick={() => void deleteProduct(product)}><Trash2/></button>
                  </div>
                </article>
              ))}</div>
            ) : <div className="emptyState"><h2>No tracked items</h2><p>Open a product page and select Track in the PriceRadar overlay.</p></div>}
          </>
        )}
      </section>
      {selectedProduct && <aside className="detail"><button className="close" onClick={() => setSelected(null)}>×</button><div className="detailImage">{selectedProduct.title.slice(0, 1)}</div><span className="retailer">{selectedProduct.domain}</span><h2>{selectedProduct.title}</h2><strong className="detailPrice">{formatMinorUnits(selectedProduct.currentPrice, selectedProduct.currency)}</strong><button className="primary" onClick={() => void chrome.tabs.create({ url: selectedProduct.url })}>Open product</button><div className="detailActions"><button type="button" onClick={() => { setEditingId(selectedProduct.id); setDraftTitle(selectedProduct.title); setSelected(null); }}><Pencil/> Rename</button><button type="button" onClick={() => void deleteProduct(selectedProduct)}><Trash2/> Delete</button></div></aside>}
      {deletedProduct && <div className="toast" role="status"><span>{deletedProduct.title} deleted</span><button onClick={() => void undoDelete()}>Undo</button></div>}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><SidePanel/></StrictMode>);
