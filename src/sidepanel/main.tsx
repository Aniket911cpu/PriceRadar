import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, ChartNoAxesCombined, ChevronRight, LayoutGrid, List, Search, Settings, SlidersHorizontal } from "lucide-react";
import "../ui/tokens.css";
import "./styles.css";
import { createMockProducts } from "../ui/mockRepository";

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values.map((value, index) => `${index * (160 / (values.length - 1))},${44 - ((value - min) / (max - min || 1)) * 36}`).join(" ");
  return <svg viewBox="0 0 160 48" role="img" aria-label="30 day price sparkline"><defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#E05A2B" stopOpacity=".25"/><stop offset="1" stopColor="#E05A2B" stopOpacity="0"/></linearGradient></defs><polygon points={`0,48 ${points} 160,48`} fill="url(#sparkFill)"/><polyline points={points} fill="none" stroke="#E05A2B" strokeWidth="2"/></svg>;
}

function SidePanel() {
  const [products, setProducts] = useState(createMockProducts);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = useMemo(() => products.filter((product) => product.title.toLowerCase().includes(query.toLowerCase()) || product.retailer.toLowerCase().includes(query.toLowerCase())) , [products, query]);
  const selectedProduct = products.find((product) => product.id === selected);
  const simulateDrop = () => {
    setProducts((current) => current.map((product, index) => index === 0 ? { ...product, previousPrice: product.currentPrice, currentPrice: product.currentPrice - 1200, dealScore: 97 } : product));
    setNotice("Price dropped to ₹23,799 · 4.8%");
    setTimeout(() => setNotice(""), 4000);
  };
  return <main className="dashboard">
    <aside className="nav"><div className="brand"><span className="brandMark">P</span><strong>PriceRadar</strong></div><nav><button className="active"><LayoutGrid/>Dashboard</button><button><Bell/>Notifications <b>3</b></button><button><ChartNoAxesCombined/>Savings</button></nav><button className="settings" onClick={() => chrome.runtime.openOptionsPage()}><Settings/>Settings</button></aside>
    <section className="content">
      <header className="topbar"><label className="search"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search or press ⌘K"/></label><button className="simulate" onClick={simulateDrop}>Simulate price drop</button></header>
      <div className="kpis"><article><span>Tracked</span><strong>40</strong><small>+6 this month</small></article><article><span>Dropped today</span><strong>3</strong><small className="good">₹4,200 potential</small></article><article><span>Near target</span><strong>7</strong><small>Within 10%</small></article><article><span>Lifetime savings</span><strong>₹18.4k</strong><small className="good">6 purchases</small></article></div>
      <div className="sectionTitle"><div><span className="eyebrow">DEALS RADAR</span><h1>Good prices, ranked</h1></div><div className="viewButtons"><button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><LayoutGrid/></button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view"><List/></button></div></div>
      <div className={`productGrid ${view}`}>
        {filtered.map((product) => <article className="dealCard" key={product.id} onClick={() => setSelected(product.id)}>
          <div className="dealTop"><div className="dealImage">{product.brand.slice(0,1)}</div><div className="score" style={{ "--score": `${product.dealScore * 3.6}deg` } as React.CSSProperties}><span>{product.dealScore}</span></div></div>
          <span className="retailer">{product.retailer} · {product.variant}</span><h2>{product.title}</h2><div className="dealPrice"><strong>₹{product.currentPrice.toLocaleString("en-IN")}</strong><span>▼ {Math.round((product.previousPrice-product.currentPrice)/product.previousPrice*100)}%</span></div><Sparkline values={product.spark}/>
        </article>)}
      </div>
    </section>
    {selectedProduct && <aside className="detail"><button className="close" onClick={() => setSelected(null)}>×</button><div className="detailImage">{selectedProduct.brand.slice(0,1)}</div><span className="retailer">{selectedProduct.retailer} · {selectedProduct.variant}</span><h2>{selectedProduct.title}</h2><strong className="detailPrice">₹{selectedProduct.currentPrice.toLocaleString("en-IN")}</strong><div className="detailScore"><b>{selectedProduct.dealScore}</b><span>Great deal</span></div><p>Great deal — this is 8% below the 90-day average.</p><h3>Buy or wait</h3><div className="verdict">Likely to drop <span>68% confidence</span></div><button className="primary">Set alert at ₹{selectedProduct.targetPrice.toLocaleString("en-IN")}</button></aside>}
    {notice && <div className="toast" role="status"><Bell/><span>{notice}</span></div>}
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><SidePanel/></StrictMode>);
