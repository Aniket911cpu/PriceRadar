import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, ChevronRight, Pause, Search, Settings, SlidersHorizontal, TrendingDown } from "lucide-react";
import "./styles.css";
import "../ui/tokens.css";
import { createMockProducts, type TrackedProduct } from "../ui/mockRepository";

function Popup() {
  const [tab, setTab] = useState<"page" | "tracked">("page");
  const [sheet, setSheet] = useState(false);
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(createMockProducts);
  const current = items[0];
  const filtered = useMemo(() => items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) || item.retailer.toLowerCase().includes(query.toLowerCase())), [items, query]);
  return (
    <main className="popup">
      <header className="header">
        <div className="brand"><span className="brandMark">P</span><strong>PriceRadar</strong></div>
        <div className="headerActions">
          <button className={`pause ${paused ? "active" : ""}`} type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume checking" : "Pause checking"}><Pause size={15}/></button>
          <button className="iconButton" type="button" aria-label="Open notifications"><Bell size={18}/></button>
          <button className="iconButton" type="button" aria-label="Open settings" onClick={() => chrome.runtime.openOptionsPage()}><Settings size={18}/></button>
        </div>
      </header>
      <div className="statusBar"><span className="healthDot"/>{paused ? "Paused · no checks will run" : "Checked 12 min ago · next check in 18 min"}<span className="local"><span/>Local only</span></div>
      <nav className="tabs" aria-label="Popup sections">
        <button className={tab === "page" ? "active" : ""} onClick={() => setTab("page")}>This page</button>
        <button className={tab === "tracked" ? "active" : ""} onClick={() => setTab("tracked")}>Tracked <b>{items.length}</b></button>
      </nav>
      {tab === "page" ? (
        <section className="pageTab">
          <article className="productCard">
            <div className="productImage"><span>{current.brand.slice(0, 1)}</span></div>
            <div className="productInfo"><span className="retailer">{current.retailer} · {current.variant}</span><h1>{current.title}</h1><div className="priceRow"><strong>₹{current.currentPrice.toLocaleString("en-IN")}</strong><s>₹{current.mrp.toLocaleString("en-IN")}</s></div><span className="drop"><TrendingDown size={13}/> 4.2% below last week</span></div>
          </article>
          <div className="confidence"><span>Good match</span><span><i style={{ width: "92%" }}/></span><b>92%</b></div>
          <button className="primary" type="button" onClick={() => setSheet(true)}>Track this price</button>
          <button className="textButton" type="button" onClick={() => setSheet(true)}>Pick price manually</button>
          <div className="compare"><span><b>Cheaper elsewhere</b><small>Saved ₹1,200</small></span><ChevronRight size={18}/></div>
        </section>
      ) : (
        <section className="trackedTab">
          <label className="search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tracked items" aria-label="Search tracked items"/></label>
          <div className="filters"><button className="active">All</button><button>Dropped</button><button>Near target</button><button>Paused</button><button><SlidersHorizontal size={13}/></button></div>
          <div className="itemList">
            {filtered.map((item) => (
              <article className="itemRow" key={item.id}>
                <div className="thumb">{item.brand.slice(0, 1)}</div>
                <div className="itemText"><strong>{item.title}</strong><span>{item.retailer} · {item.lastChecked}</span><div className="targetBar"><i style={{ width: `${Math.min(100, item.dealScore)}%` }}/></div></div>
                <div className="itemPrice"><strong>₹{item.currentPrice.toLocaleString("en-IN")}</strong><span className="drop">▼ {(100 * (item.previousPrice - item.currentPrice) / item.previousPrice).toFixed(1)}%</span></div>
              </article>
            ))}
          </div>
        </section>
      )}
      {sheet && <div className="backdrop" onClick={() => setSheet(false)}><section className="sheet" role="dialog" aria-modal="true" aria-label="Add alert" onClick={(event) => event.stopPropagation()}>
        <div className="handle"/><h2>Add alert</h2><p>Choose when PriceRadar should notify you.</p>
        <div className="modes"><button className="active">Target price</button><button>Any drop</button><button>Range</button></div>
        <label className="field">Target price<div className="currency"><span>₹</span><input defaultValue={current.targetPrice} inputMode="numeric" aria-label="Target price"/></div></label>
        <div className="presets"><button>−5%</button><button>−10%</button><button>−20%</button><button>All-time low</button></div>
        <div className="preview">It would have triggered <strong>3 times</strong> in the last 90 days.</div>
        <div className="sheetActions"><button className="secondary" onClick={() => setSheet(false)}>Cancel</button><button className="primary" onClick={() => { setItems(items.map((item, index) => index === 0 ? {...item, status: "active"} : item)); setSheet(false); }}>Start tracking</button></div>
      </section></div>}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Popup /></StrictMode>);
