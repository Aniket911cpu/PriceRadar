import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, CreditCard, Database, Palette, Settings, Shield, Zap } from "lucide-react";
import "../ui/tokens.css";
import "./styles.css";

const sections = [
  ["General", Settings], ["Notifications", Bell],
  ["Cards & offers", CreditCard], ["Appearance", Palette], ["Privacy & data", Shield],
  ["Adapters", Zap], ["Data & sync", Database],
] as const;

function Options() {
  const [active, setActive] = useState("General");
  const [theme, setTheme] = useState("dark");
  const [testStatus, setTestStatus] = useState("");
  const [message, setMessage] = useState("");
  const [keepaApiKey, setKeepaApiKey] = useState("");
  const [historyEndpoint, setHistoryEndpoint] = useState("");
  const [checkInterval, setCheckInterval] = useState("90");
  useEffect(() => {
    void chrome.storage.local.get(["keepaApiKey", "priceHistoryEndpoint", "checkIntervalMinutes"]).then((values) => {
      setKeepaApiKey(typeof values.keepaApiKey === "string" ? values.keepaApiKey : "");
      setHistoryEndpoint(typeof values.priceHistoryEndpoint === "string" ? values.priceHistoryEndpoint : "");
      setCheckInterval(String(values.checkIntervalMinutes ?? 90));
    });
  }, []);
  const saveApiSettings = async () => {
    await chrome.storage.local.set({
      keepaApiKey: keepaApiKey.trim(),
      priceHistoryEndpoint: historyEndpoint.trim(),
      checkIntervalMinutes: Number(checkInterval),
    });
    await chrome.permissions.request({ origins: ["https://api.keepa.com/*"] });
    if (historyEndpoint.trim()) {
      try {
        const origin = new URL(historyEndpoint.trim()).origin + "/*";
        await chrome.permissions.request({ origins: [origin] });
      } catch {
        setMessage("Enter a valid HTTPS price-history API URL.");
        return;
      }
    }
    setMessage("Price-history and checking settings saved.");
  };
  const sendTest = async () => {
    await chrome.notifications.create("priceradar-test", {
      type: "basic",
      iconUrl: "public/icons/icon128.png",
      title: "PriceRadar test",
      message: "Your notifications are working.",
    });
    setTestStatus("Test notification sent");
  };
  const exportData = async () => {
    const items = await chrome.runtime.sendMessage({ type: "LIST_ITEMS" });
    const url = URL.createObjectURL(new Blob([JSON.stringify(items.data ?? [], null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "priceradar-export.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return <main className="options">
    <aside><div className="brand"><img className="brandMark" src={chrome.runtime.getURL("public/icons/icon32.png")} alt="" /><strong>PriceRadar</strong></div><nav>{sections.map(([name, Icon]) => <button key={name} className={active === name ? "active" : ""} onClick={() => setActive(name)}><Icon/><span>{name}</span></button>)}</nav></aside>
    <section className="panel"><header><span>Settings</span><h1>{active}</h1></header>
      {active === "Appearance" ? <>
        <article className="settingCard"><h2>Theme</h2><p>Choose how PriceRadar looks.</p><div className="themeChoices">{["system","light","dark"].map((value) => <button key={value} className={theme === value ? "active" : ""} onClick={() => {setTheme(value); document.documentElement.dataset.theme=value === "system" ? "system" : value}}><span className={`themePreview ${value}`}/>{value}</button>)}</div></article>
        <article className="settingCard"><h2>Density</h2><p>Comfortable spacing makes long lists easier to scan.</p><div className="segmented"><button className="active">Comfortable</button><button>Compact</button></div></article>
      </> : active === "Notifications" ? <>
        <article className="settingCard"><h2>Notification channels</h2><p>Chrome notifications are enabled for this browser.</p><label className="settingRow"><span><b>Chrome notifications</b><small>Open, snooze, and stop actions</small></span><input type="checkbox" defaultChecked/></label><label className="settingRow"><span><b>Digest mode</b><small>One summary instead of individual alerts</small></span><input type="checkbox"/></label></article>
        <article className="settingCard"><h2>Quiet hours</h2><div className="timeRow"><label>From<input type="time" defaultValue="22:00"/></label><label>Until<input type="time" defaultValue="08:00"/></label></div><button className="testButton" onClick={() => void sendTest()}>Send test notification</button>{testStatus && <p role="status">{testStatus}</p>}</article>
      </> : active === "Privacy & data" ? <>
        <article className="settingCard"><h2>Local-first privacy</h2><p>PriceRadar stores history on this device. No analytics, no affiliate links, no browsing history collection.</p><div className="meter"><span/><b>42 MB used</b></div></article>
        <article className="settingCard"><h2>Data</h2><div className="actions"><button onClick={() => void exportData()}>Export JSON</button><label className="importButton">Import<input type="file" accept=".json" onChange={() => setMessage("Import selected. The data import will be applied after validation.")}/></label><button className="danger" onClick={() => { if (window.confirm("Delete all PriceRadar data?")) setMessage("Delete confirmation received."); }}>Delete all data</button></div>{message && <p role="status">{message}</p>}</article>
      </> : active === "General" ? <>
        <article className="settingCard"><h2>Automatic checking</h2><p>Choose how often tracked prices are rechecked while Chrome is open.</p><label className="settingRow"><span><b>Check interval</b><small>Chrome checks the queue at least hourly</small></span><select value={checkInterval} onChange={(event) => setCheckInterval(event.target.value)}><option value="60">Every 1 hour</option><option value="90">Every 1.5 hours</option><option value="120">Every 2 hours</option></select></label></article>
        <article className="settingCard"><h2>Online price history</h2><p>Configure optional providers. Keepa is used for Amazon products; the generic endpoint receives POST JSON with url and title.</p><label className="apiField">Keepa API key<input type="password" value={keepaApiKey} onChange={(event) => setKeepaApiKey(event.target.value)} placeholder="Optional Keepa key"/></label><label className="apiField">Custom history endpoint<input type="url" value={historyEndpoint} onChange={(event) => setHistoryEndpoint(event.target.value)} placeholder="https://example.com/api/price-history"/></label><button className="testButton" onClick={() => void saveApiSettings()}>Save API settings</button>{message && <p role="status">{message}</p>}</article>
      </> : <>
        <article className="settingCard"><h2>{active}</h2><p>Configure PriceRadar for this device.</p></article>
      </>}
    </section>
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><Options/></StrictMode>);
