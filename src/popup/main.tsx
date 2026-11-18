import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, Pause, Play, Search, Settings, SlidersHorizontal, Pencil, Trash2 } from "lucide-react";
import "./styles.css";
import "../ui/tokens.css";
import type { AlertEvent, Item, PricePoint } from "../shared/types";

type RuntimeResponse<T = unknown> = { ok: boolean; data?: T };
function formatMinorUnits(minorUnits: number | null, currency = "INR"): string {
  if (minorUnits === null) return "Price unavailable";
  const divisor = currency === "JPY" ? 1 : 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(minorUnits / divisor);
}
interface CurrentExtraction {
  title: string;
  canonicalUrl: string;
  domain: string;
  currentPrice: { minorUnits: number; currency: string; raw: string };
  currency: string;
  confidence: number;
  method: string;
  availability: string;
  productKey: string;
  imageUrl?: string;
  listPrice?: { minorUnits: number; currency: string; raw: string };
}

function HistoryChart({ points, currency, current }: { points: PricePoint[]; currency: string; current: number }) {
  const values = points.length ? points.map((point) => point.price) : [current];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const graphPoints = values.map((value, index) => {
    const x = values.length === 1 ? 0 : index * (280 / (values.length - 1));
    const y = max === min ? 28 : 48 - ((value - min) / (max - min)) * 40;
    return `${x},${y}`;
  }).join(" ");
  const formatted = (value: number) => formatMinorUnits(value, currency);
  return (
    <div className="historyChart" aria-label={`Price history. Lowest ${formatted(min)}, highest ${formatted(max)}.`}>
      <div className="chartHeader"><span>Price history</span><strong>{formatted(min)} — {formatted(max)}</strong></div>
      <svg viewBox="0 0 280 52" role="img" aria-label="Historical price chart" preserveAspectRatio="none">
        <polygon points={`0,52 ${graphPoints} 280,52`} fill="#E05A2B22"/>
        <polyline points={graphPoints} fill="none" stroke="#E05A2B" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
      </svg>
    </div>
  );
}

function Popup() {
  const [tab, setTab] = useState<"page" | "tracked" | "notifications">("page");
  const [sheet, setSheet] = useState(false);
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [notifications, setNotifications] = useState<AlertEvent[]>([]);
  const [filter, setFilter] = useState("All");
  const [mode, setMode] = useState<"target_price" | "any_drop" | "price_range" | "all_time_low">("target_price");
  const [target, setTarget] = useState("");
  const [tracking, setTracking] = useState(false);
  const [notice, setNotice] = useState("");
  const [currentExtraction, setCurrentExtraction] = useState<CurrentExtraction | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [deletedItem, setDeletedItem] = useState<Item | null>(null);

  useEffect(() => {
    void chrome.runtime.sendMessage({ type: "LIST_ITEMS" }).then((response: RuntimeResponse<Item[]>) => {
      if (response.ok && response.data) setItems(response.data);
    });
    void chrome.runtime.sendMessage({ type: "GET_PAUSED" }).then((response: RuntimeResponse<boolean>) => {
      if (response.ok) setPaused(Boolean(response.data));
    });
    void chrome.runtime.sendMessage({ type: "GET_NOTIFICATIONS" }).then((response: RuntimeResponse<AlertEvent[]>) => {
      if (response.ok && response.data) setNotifications(response.data);
    });
    void chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
      if (!tab.id) return;
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_EXTRACTION" }) as RuntimeResponse<CurrentExtraction>;
        if (response.ok && response.data) {
          setCurrentExtraction(response.data);
          const historyResponse = await chrome.runtime.sendMessage({ type: "GET_PRICE_HISTORY", url: response.data.canonicalUrl }) as RuntimeResponse<Array<{ ts: number; price: number }>>;
          if (historyResponse.ok && historyResponse.data) {
            setHistory(historyResponse.data.map((point, index) => ({
              id: `history-${index}`,
              itemId: "",
              ts: point.ts,
              price: point.price,
              availability: "unknown",
              source: "import",
              confidence: 0.9,
            })));
          }
        }
      } catch {
        setCurrentExtraction(null);
      }
    });
  }, []);

  useEffect(() => {
    const matched = currentExtraction
      ? items.find((item) => item.productKey === currentExtraction.productKey)
      : undefined;
    if (!matched) return;
    void chrome.runtime.sendMessage({ type: "GET_PRICE_HISTORY", itemId: matched.id }).then((response: RuntimeResponse<PricePoint[]>) => {
      if (response.ok && response.data) setHistory(response.data);
    });
  }, [currentExtraction, items]);

  const filtered = useMemo(() => {
    let result = items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) || item.domain.includes(query.toLowerCase()));
    if (filter === "Dropped") result = result.filter((item) => item.lowestPrice !== null && item.currentPrice !== null && item.currentPrice < item.lowestPrice);
    if (filter === "Near target") result = result.filter((item) => item.status === "active");
    if (filter === "Paused") result = result.filter((item) => item.status === "paused");
    return result;
  }, [items, query, filter]);

  const togglePause = async () => {
    const next = !paused;
    setPaused(next);
    await chrome.runtime.sendMessage({ type: "SET_PAUSED", paused: next });
  };

  const openNotifications = async () => {
    setTab("notifications");
    setNotifications((current) => current.map((entry) => ({ ...entry, read: true })));
    await chrome.runtime.sendMessage({ type: "MARK_NOTIFICATIONS_READ" });
  };

  const trackCurrentProduct = async () => {
    if (!currentExtraction) return;
    setTracking(true);
    const response = await chrome.runtime.sendMessage({ type: "CAPTURE_PRICE", extraction: currentExtraction }) as RuntimeResponse<string>;
    setTracking(false);
    if (response.ok) {
      const listed = await chrome.runtime.sendMessage({ type: "LIST_ITEMS" }) as RuntimeResponse<Item[]>;
      if (listed.ok && listed.data) setItems(listed.data);
      setNotice("Product added to tracking");
      setSheet(true);
    } else {
      setNotice("Could not add this product");
    }
  };

  const startTracking = async () => {
    if (!items.length) {
      setNotice("Open a product page and use Track there first.");
      return;
    }
    setTracking(true);
    const first = currentExtraction
      ? items.find((item) => item.productKey === currentExtraction.productKey) ?? items[0]
      : items[0];
    const numericTarget = Number(target) * 100;
    await chrome.runtime.sendMessage({
      type: "CREATE_ALERT",
      itemId: first.id,
      mode,
      target: Number.isFinite(numericTarget) && numericTarget > 0 ? numericTarget : undefined,
    });
    setTracking(false);
    setSheet(false);
    setNotice("Alert added");
  };

  const renameItem = async (item: Item) => {
    const title = draftTitle.trim();
    if (!title) return;
    await chrome.runtime.sendMessage({ type: "UPDATE_ITEM", itemId: item.id, title });
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, title } : candidate));
    setEditingId(null);
  };

  const toggleItemPause = async (item: Item) => {
    const status = item.status === "paused" ? "active" : "paused";
    await chrome.runtime.sendMessage({ type: "UPDATE_ITEM", itemId: item.id, status });
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status } : candidate));
  };

  const deleteItem = async (item: Item) => {
    setDeletedItem(item);
    await chrome.runtime.sendMessage({ type: "DELETE_ITEM", itemId: item.id });
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
  };

  const undoDelete = async () => {
    if (!deletedItem) return;
    await chrome.runtime.sendMessage({ type: "TRACK_ITEM", item: deletedItem });
    setItems((current) => [deletedItem, ...current]);
    setDeletedItem(null);
  };

  return (
    <main className="popup">
      <header className="header">
        <div className="brand"><img className="brandMark" src={chrome.runtime.getURL("public/icons/icon32.png")} alt="" /><strong>PriceRadar</strong></div>
        <div className="headerActions">
          <button className={`pause ${paused ? "active" : ""}`} type="button" onClick={() => void togglePause()} aria-label={paused ? "Resume checking" : "Pause checking"}>{paused ? <Play size={16}/> : <Pause size={16}/>}</button>
          <button className="iconButton" type="button" aria-label="Open notifications" onClick={() => void openNotifications()}><Bell size={18}/>{notifications.some((entry) => !entry.read) && <span className="notificationDot"/>}</button>
          <button className="iconButton" type="button" aria-label="Open settings" onClick={() => chrome.runtime.openOptionsPage()}><Settings size={18}/></button>
        </div>
      </header>
      <div className="statusBar"><span className={`healthDot ${paused ? "paused" : ""}`}/>{paused ? "Checking paused" : "PriceRadar is active"}<span className="local">Private by default</span></div>
      <nav className="tabs" aria-label="Popup sections">
        <button className={tab === "page" ? "active" : ""} onClick={() => setTab("page")}>This page</button>
        <button className={tab === "tracked" ? "active" : ""} onClick={() => setTab("tracked")}>Tracked <b>{items.length}</b></button>
      </nav>
      {tab === "page" && (
        <section className="pageTab">
          {!items.length && !currentExtraction ? (
            <div className="emptyState"><h1>No product detected</h1><p>Open a product page and select Track in the PriceRadar overlay.</p></div>
          ) : currentExtraction && !items.find((item) => item.productKey === currentExtraction.productKey) ? (
            <>
              <article className="productCard">
                <div className="productImage"><span>{currentExtraction.title.slice(0, 1)}</span></div>
                <div className="productInfo"><span className="retailer">{currentExtraction.domain}</span><h1>{currentExtraction.title}</h1><div className="priceRow"><strong>{formatMinorUnits(currentExtraction.currentPrice.minorUnits, currentExtraction.currency)}</strong></div></div>
              </article>
              <HistoryChart
                points={history}
                currency={currentExtraction.currency}
                current={currentExtraction.currentPrice.minorUnits}
              />
              <button className="primary" type="button" disabled={tracking} onClick={() => void trackCurrentProduct()}>{tracking ? "Adding…" : "Track this product"}</button>
            </>
          ) : (
            <>
              {items.slice(0, 1).map((item) => (
                <article className="productCard" key={item.id}>
                  <div className="productImage"><span>{item.title.slice(0, 1)}</span></div>
                  <div className="productInfo"><span className="retailer">{item.domain}</span><h1>{item.title}</h1><div className="priceRow"><strong>{formatMinorUnits(item.currentPrice, item.currency)}</strong></div></div>
                </article>
              ))}
              {items[0] && <HistoryChart points={history.length ? history : []} currency={items[0].currency} current={items[0].currentPrice ?? 0}/>}
              <button className="primary" type="button" onClick={() => setSheet(true)}>Add alert</button>
            </>
          )}
        </section>
      )}
      {tab === "tracked" && (
        <section className="trackedTab">
          <label className="search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tracked items" aria-label="Search tracked items"/></label>
          <div className="filters">{["All","Dropped","Near target","Paused"].map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value}</button>)}<button aria-label="More filters"><SlidersHorizontal size={13}/></button></div>
          <div className="itemList">{filtered.length ? filtered.map((item) => (
            <article className="itemRow" key={item.id}>
              <div className="thumb">{item.title.slice(0, 1)}</div>
              <div className="itemText">
                {editingId === item.id ? (
                  <div className="renameRow">
                    <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} aria-label="Product name" />
                    <button type="button" onClick={() => void renameItem(item)}>Save</button>
                    <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : <strong>{item.title}</strong>}
                <span>{item.domain} · {item.lastCheckedAt ? "Recently checked" : "Not checked"}</span>
                <div className="itemActions">
                  <button type="button" aria-label={`Rename ${item.title}`} onClick={() => { setEditingId(item.id); setDraftTitle(item.title); }}><Pencil size={12}/></button>
                  <button type="button" aria-label={item.status === "paused" ? `Resume ${item.title}` : `Pause ${item.title}`} onClick={() => void toggleItemPause(item)}>{item.status === "paused" ? <Play size={12}/> : <Pause size={12}/>}</button>
                  <button type="button" aria-label={`Delete ${item.title}`} onClick={() => void deleteItem(item)}><Trash2 size={12}/></button>
                </div>
              </div>
              <div className="itemPrice"><strong>{formatMinorUnits(item.currentPrice, item.currency)}</strong></div>
            </article>
          )) : <div className="emptyState"><h1>No tracked items</h1><p>Tracked products will appear here.</p></div>}</div>
        </section>
      )}
      {tab === "notifications" && (
        <section className="notificationList">
          {notifications.length ? notifications.map((entry) => <article className="notificationRow" key={entry.id}><Bell size={16}/><div><strong>{entry.message}</strong><button onClick={() => { void chrome.tabs.create({ url: items.find((item) => item.id === entry.itemId)?.url }); }}>Open product</button></div></article>) : <div className="emptyState"><h1>No notifications</h1><p>Price alerts will appear here.</p></div>}
        </section>
      )}
      {sheet && <div className="backdrop" onClick={() => setSheet(false)}><section className="sheet" role="dialog" aria-modal="true" aria-label="Add alert" onClick={(event) => event.stopPropagation()}>
        <div className="handle"/><h2>Add alert</h2><p>Choose when PriceRadar should notify you.</p>
        <div className="modes">
          <button className={mode === "target_price" ? "active" : ""} onClick={() => setMode("target_price")}>Target price</button>
          <button className={mode === "any_drop" ? "active" : ""} onClick={() => setMode("any_drop")}>Any drop</button>
          <button className={mode === "price_range" ? "active" : ""} onClick={() => setMode("price_range")}>Range</button>
          <button className={mode === "all_time_low" ? "active" : ""} onClick={() => setMode("all_time_low")}>All-time low</button>
        </div>
        {mode === "target_price" && <label className="field">Target price<div className="currency"><span>₹</span><input value={target} onChange={(event) => setTarget(event.target.value)} inputMode="numeric" aria-label="Target price"/></div></label>}
        {mode === "any_drop" && <div className="preview">Notify when the price drops by at least <strong>5%</strong>.</div>}
        {mode === "price_range" && <label className="field">Maximum price<div className="currency"><span>₹</span><input value={target} onChange={(event) => setTarget(event.target.value)} inputMode="numeric" aria-label="Maximum price"/></div></label>}
        {mode === "all_time_low" && <div className="preview">Notify when this becomes an <strong>all-time low</strong>.</div>}
        <div className="sheetActions"><button className="secondary" onClick={() => setSheet(false)}>Cancel</button><button className="primary" disabled={tracking} onClick={() => void startTracking()}>{tracking ? "Adding…" : "Start tracking"}</button></div>
      </section></div>}
      {notice && <div className="popupToast" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {deletedItem && <div className="popupToast" role="status">{deletedItem.title} deleted<button onClick={() => void undoDelete()}>Undo</button></div>}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Popup /></StrictMode>);
