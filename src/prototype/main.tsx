import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, LayoutDashboard, PackageSearch, Settings } from "lucide-react";
import "../ui/tokens.css";
import "./styles.css";
import { createMockProducts } from "../ui/mockRepository";

function Prototype() {
  const [items, setItems] = useState(createMockProducts);
  const [notice, setNotice] = useState("");
  const simulate = () => {
    setItems((current) => current.map((item, index) => index === 0 ? { ...item, previousPrice: item.currentPrice, currentPrice: item.currentPrice - 1200, dealScore: 97 } : item));
    setNotice("₹23,799 · price dropped 4.8%");
  };
  return <main className="prototype"><aside><div className="brand"><span>P</span><b>PriceRadar</b></div><button className="active"><LayoutDashboard/>Dashboard</button><button><Bell/>Notifications</button><button><PackageSearch/>Products</button><button><Settings/>Settings</button></aside><section><header><div><small>ALPHA / INTERACTIVE PROTOTYPE</small><h1>Deals Radar</h1></div><button onClick={simulate}>Simulate price drop</button></header><div className="cards">{items.slice(0,6).map((item) => <article key={item.id}><div className="preview">{item.brand[0]}</div><small>{item.retailer}</small><h2>{item.title}</h2><strong>₹{item.currentPrice.toLocaleString("en-IN")}</strong><div className="score">Deal {item.dealScore}</div></article>)}</div></section>{notice && <div className="notice"><Bell/><div><b>Price dropped</b><span>{notice}</span></div><button onClick={() => setNotice("")}>×</button></div>}</main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><Prototype/></StrictMode>);
