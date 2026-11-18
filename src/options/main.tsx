import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, CreditCard, Database, Palette, Settings, Shield, SlidersHorizontal, Zap } from "lucide-react";
import "../ui/tokens.css";
import "./styles.css";

const sections = [
  ["General", Settings], ["Checking", SlidersHorizontal], ["Notifications", Bell],
  ["Cards & offers", CreditCard], ["Appearance", Palette], ["Privacy & data", Shield],
  ["Adapters", Zap], ["Data & sync", Database],
] as const;

function Options() {
  const [active, setActive] = useState("General");
  const [theme, setTheme] = useState("dark");
  return <main className="options">
    <aside><div className="brand"><span className="brandMark">P</span><strong>PriceRadar</strong></div><nav>{sections.map(([name, Icon]) => <button key={name} className={active === name ? "active" : ""} onClick={() => setActive(name)}><Icon/><span>{name}</span></button>)}</nav></aside>
    <section className="panel"><header><span>Settings</span><h1>{active}</h1></header>
      {active === "Appearance" ? <>
        <article className="settingCard"><h2>Theme</h2><p>Choose how PriceRadar looks.</p><div className="themeChoices">{["system","light","dark"].map((value) => <button key={value} className={theme === value ? "active" : ""} onClick={() => {setTheme(value); document.documentElement.dataset.theme=value === "system" ? "system" : value}}><span className={`themePreview ${value}`}/>{value}</button>)}</div></article>
        <article className="settingCard"><h2>Density</h2><p>Comfortable spacing makes long lists easier to scan.</p><div className="segmented"><button className="active">Comfortable</button><button>Compact</button></div></article>
      </> : active === "Notifications" ? <>
        <article className="settingCard"><h2>Notification channels</h2><p>Chrome notifications are enabled for this browser.</p><label className="settingRow"><span><b>Chrome notifications</b><small>Open, snooze, and stop actions</small></span><input type="checkbox" defaultChecked/></label><label className="settingRow"><span><b>Digest mode</b><small>One summary instead of individual alerts</small></span><input type="checkbox"/></label></article>
        <article className="settingCard"><h2>Quiet hours</h2><div className="timeRow"><label>From<input type="time" defaultValue="22:00"/></label><label>Until<input type="time" defaultValue="08:00"/></label></div><button className="testButton">Send test notification</button></article>
      </> : active === "Privacy & data" ? <>
        <article className="settingCard"><h2>Local-first privacy</h2><p>PriceRadar stores history on this device. No analytics, no affiliate links, no browsing history collection.</p><div className="meter"><span/><b>42 MB used</b></div></article>
        <article className="settingCard"><h2>Data</h2><div className="actions"><button>Export JSON</button><button>Import</button><button className="danger">Delete all data</button></div></article>
      </> : <>
        <article className="settingCard"><h2>{active}</h2><p>Configure PriceRadar for this device.</p><label className="settingRow"><span><b>Smart checking</b><small>Check more often near an active target</small></span><input type="checkbox" defaultChecked/></label><label className="settingRow"><span><b>Background checks</b><small>Requests run only while Chrome is open</small></span><input type="checkbox" defaultChecked/></label></article>
      </>}
    </section>
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><Options/></StrictMode>);
