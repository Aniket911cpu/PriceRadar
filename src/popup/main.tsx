import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, Pause, Play, Search, Settings, SlidersHorizontal } from "lucide-react";
import "./styles.css";
import "../ui/tokens.css";
import type { AlertEvent, Item } from "../shared/types";

type RuntimeResponse<T = unknown> = { ok: boolean; data?: T };

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
  }, []);

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

  const startTracking = async () => {
    if (!items.length) {
      setNotice("Open a product page and use Track there first.");
      return;
    }
    setTracking(true);
    const first = items[0];
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
          {!items.length ? (
            <div className="emptyState"><h1>No product detected</h1><p>Open a product page and select Track in the PriceRadar overlay.</p></div>
          ) : (
            <>
              {items.slice(0, 1).map((item) => (
                <article className="productCard" key={item.id}>
                  <div className="productImage"><span>{item.title.slice(0, 1)}</span></div>
                  <div className="productInfo"><span className="retailer">{item.domain}</span><h1>{item.title}</h1><div className="priceRow"><strong>{item.currency} {(item.currentPrice ?? 0).toLocaleString("en-IN")}</strong></div></div>
                </article>
              ))}
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
            <article className="itemRow" key={item.id}><div className="thumb">{item.title.slice(0, 1)}</div><div className="itemText"><strong>{item.title}</strong><span>{item.domain} · {item.lastCheckedAt ? "Recently checked" : "Not checked"}</span></div><div className="itemPrice"><strong>{item.currency} {(item.currentPrice ?? 0).toLocaleString("en-IN")}</strong></div></article>
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
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Popup /></StrictMode>);
