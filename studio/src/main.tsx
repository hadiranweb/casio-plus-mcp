import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Playbook = {
  id: number;
  نام_پلی_بوک: string;
  دامنه?: string;
  نوع_دارایی_هگام: string;
  سطح_هگام: string;
  نقش_مالک_استاندارد_هگام: string;
  وضعیت_نرمال_هگام: string;
  برچسب_داریم_لازم: "داریم" | "لازم";
  برچسب_توسعه: "توسعه" | null;
  خروجی_های_کلیدی: string;
  مثال_اجرایی: string;
  مسیر_بازگشت_داده: string;
  وابستگی_ها?: string[];
};

type CasioData = {
  کاسیو: {
    meta: { برند: string; برند_انگلیسی: string; نسخه: string; اسپرینت: number };
    دارایی_ها: { پلی_بوک_ها: Playbook[] };
    معماری?: { زیرسیستم_ها?: { نام: string; تعداد_پلی_بوک: number; پلی_بوک_ها: string[] }[] };
    آموزش?: { برنامه_جلسات?: { جلسه: number; عنوان: string; هدف: string; خروجی: string }[] };
  };
};

type View = "خانه" | "پلی‌بوک‌ها" | "معماری" | "شکاف‌ها" | "یادگیری";

const nav: { id: View; label: string; icon: string }[] = [
  { id: "خانه", label: "Pulse", icon: "◉" },
  { id: "پلی‌بوک‌ها", label: "پلی‌بوک‌ها", icon: "▤" },
  { id: "معماری", label: "معماری", icon: "◇" },
  { id: "شکاف‌ها", label: "داریم / لازم", icon: "◌" },
  { id: "یادگیری", label: "یادگیری", icon: "↗" },
];

function countBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const name = key(item);
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "purple" | "red" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function App() {
  const [data, setData] = useState<CasioData | null>(null);
  const [view, setView] = useState<View>("خانه");
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("همه");
  const [selected, setSelected] = useState<Playbook | null>(null);

  useEffect(() => {
    fetch("/casio.json").then((response) => response.json()).then(setData);
  }, []);

  const playbooks = data?.کاسیو.دارایی_ها.پلی_بوک_ها ?? [];
  const domains = useMemo(() => ["همه", ...Array.from(new Set(playbooks.map((p) => p.دامنه ?? "بدون دامنه")))], [playbooks]);
  const filtered = useMemo(() => playbooks.filter((p) => {
    const term = query.trim().toLocaleLowerCase("fa-IR");
    const matchesDomain = domain === "همه" || (p.دامنه ?? "بدون دامنه") === domain;
    const matchesQuery = !term || [p.نام_پلی_بوک, p.خروجی_های_کلیدی, p.مثال_اجرایی, p.دامنه ?? ""].some((field) => field.toLocaleLowerCase("fa-IR").includes(term));
    return matchesDomain && matchesQuery;
  }), [playbooks, query, domain]);

  if (!data) return <div className="loading">در حال بارگذاری CasioPlus Studio…</div>;

  const have = playbooks.filter((p) => p.برچسب_داریم_لازم === "داریم").length;
  const need = playbooks.filter((p) => p.برچسب_داریم_لازم === "لازم").length;
  const developing = playbooks.filter((p) => p.برچسب_توسعه === "توسعه").length;
  const architecture = data.کاسیو.معماری?.زیرسیستم_ها ?? [];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">C+</span><div><strong>CASIOPLUS</strong><small>STUDIO</small></div></div>
        <div className="workspace"><span className="workspace-dot" /> کاسیو‌پلاس <span className="chev">⌄</span></div>
        <nav>{nav.map((item) => <button key={item.id} className={view === item.id ? "nav active" : "nav"} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
        <div className="sidebar-bottom"><span className="signal" /> Knowledge Core <span className="online">ONLINE</span><small>YAML • v{data.کاسیو.meta.نسخه}</small></div>
      </aside>

      <section className="surface">
        <header className="topbar"><div><span className="eyebrow">CASIOPLUS / {view.toUpperCase()}</span><h1>{titleFor(view)}</h1></div><div className="top-actions"><span className="sync">● هسته دانش همگام</span><button className="command">⌘ K</button></div></header>
        {view === "خانه" && <Dashboard playbooks={playbooks} have={have} need={need} developing={developing} architecture={architecture} onOpen={setSelected} onNavigate={setView} />}
        {view === "پلی‌بوک‌ها" && <Playbooks playbooks={filtered} domains={domains} query={query} domain={domain} onQuery={setQuery} onDomain={setDomain} onOpen={setSelected} />}
        {view === "معماری" && <Architecture architecture={architecture} playbooks={playbooks} onOpen={setSelected} />}
        {view === "شکاف‌ها" && <Gaps playbooks={playbooks} onOpen={setSelected} />}
        {view === "یادگیری" && <Learning sessions={data.کاسیو.آموزش?.برنامه_جلسات ?? []} />}
      </section>
      {selected && <PlaybookDrawer playbook={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

function titleFor(view: View) {
  return ({ "خانه": "Command Pulse", "پلی‌بوک‌ها": "کتابخانه پلی‌بوک", "معماری": "معماری کاسیو", "شکاف‌ها": "داریم / لازم / توسعه", "یادگیری": "مسیر یادگیری" })[view];
}

function Dashboard({ playbooks, have, need, developing, architecture, onOpen, onNavigate }: { playbooks: Playbook[]; have: number; need: number; developing: number; architecture: { نام: string; تعداد_پلی_بوک: number; پلی_بوک_ها: string[] }[]; onOpen: (p: Playbook) => void; onNavigate: (v: View) => void }) {
  const latest = playbooks.filter((p) => p.برچسب_توسعه === "توسعه").slice(0, 4);
  return <div className="content">
    <section className="hero"><div><span className="eyebrow">KNOWLEDGE COMMAND CENTER</span><h2>دانش را ببینید.<br/><em>سیستم را بسازید.</em></h2><p>یک سطح زنده برای مشاهدهٔ دارایی‌های کاسیو‌پلاس، شکاف‌های ساختاری و مسیر تبدیل دانش به اقدام.</p><button className="primary" onClick={() => onNavigate("پلی‌بوک‌ها")}>کاوش پلی‌بوک‌ها ←</button></div><div className="hero-orbit"><div className="orbit-core">56<small>دارایی</small></div><i className="orb orb-a"/><i className="orb orb-b"/><i className="orb orb-c"/></div></section>
    <section className="metrics"><Metric label="دارایی‌های فعال" value={have} tone="green"/><Metric label="شکاف‌های لازم" value={need} tone="amber"/><Metric label="در مسیر توسعه" value={developing} tone="purple"/><Metric label="زیرسیستم" value={architecture.length} tone="cyan"/></section>
    <section className="two-col"><div className="panel"><div className="panel-head"><div><span className="eyebrow">ARCHITECTURE</span><h3>رادار زیرسیستم‌ها</h3></div><button className="link" onClick={() => onNavigate("معماری")}>مشاهده همه</button></div><div className="domain-bars">{architecture.map((item, index) => <div className="domain-row" key={item.نام}><span>{item.نام}</span><div className="bar"><i style={{ width: `${(item.تعداد_پلی_بوک / 12) * 100}%`, background: ["#7c6cff", "#22b8cf", "#51cf66", "#ffd43b", "#ffa94d", "#ff5c5c"][index] }}/></div><b>{item.تعداد_پلی_بوک}</b></div>)}</div></div>
    <div className="panel"><div className="panel-head"><div><span className="eyebrow">DEVELOPMENT RAIL</span><h3>دارایی‌های در توسعه</h3></div><button className="link" onClick={() => onNavigate("شکاف‌ها")}>مشاهده همه</button></div><div className="rail">{latest.map((p) => <button className="rail-item" key={p.id} onClick={() => onOpen(p)}><span className="rail-no">{String(p.id).padStart(2,"0")}</span><span><strong>{p.نام_پلی_بوک}</strong><small>{p.دامنه}</small></span><span>←</span></button>)}</div></div></section>
  </div>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><i /></div>; }

function Playbooks({ playbooks, domains, query, domain, onQuery, onDomain, onOpen }: { playbooks: Playbook[]; domains: string[]; query: string; domain: string; onQuery: (v: string) => void; onDomain: (v: string) => void; onOpen: (p: Playbook) => void }) {
 return <div className="content"><div className="filters"><input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="جست‌وجو در پلی‌بوک‌ها، خروجی‌ها و مثال‌ها…"/><select value={domain} onChange={(e) => onDomain(e.target.value)}>{domains.map((item) => <option key={item}>{item}</option>)}</select><span>{playbooks.length} نتیجه</span></div><div className="playbook-grid">{playbooks.map((p) => <button className="playbook-card" key={p.id} onClick={() => onOpen(p)}><div className="card-top"><span className="id">#{String(p.id).padStart(2,"0")}</span><Badge tone={p.برچسب_داریم_لازم === "داریم" ? "green" : "amber"}>{p.برچسب_داریم_لازم}</Badge></div><h3>{p.نام_پلی_بوک}</h3><p>{p.خروجی_های_کلیدی}</p><div className="card-footer"><span>{p.دامنه}</span><span>{p.سطح_هگام.split(":")[0]}</span></div></button>)}</div></div>;
}

function Architecture({ architecture, playbooks, onOpen }: { architecture: { نام: string; تعداد_پلی_بوک: number; پلی_بوک_ها: string[] }[]; playbooks: Playbook[]; onOpen: (p: Playbook) => void }) {
 return <div className="content"><div className="architecture-map"><div className="map-core"><strong>CASIO<br/>CORE</strong><span>HEGAM</span></div>{architecture.map((domain, index) => <div className={`arch-node node-${index}`} key={domain.نام}><span className="node-count">{domain.تعداد_پلی_بوک}</span><h3>{domain.نام}</h3><p>{domain.پلی_بوک_ها.slice(0, 2).join(" • ")}</p></div>)}</div><section className="panel"><div className="panel-head"><div><span className="eyebrow">DEPENDENCY VIEW</span><h3>ورود به دامنه‌ها</h3></div></div><div className="domain-list">{architecture.map((domain) => <div className="domain-detail" key={domain.نام}><h3>{domain.نام}<Badge tone="purple">{domain.تعداد_پلی_بوک} پلی‌بوک</Badge></h3><div>{domain.پلی_بوک_ها.map((name) => { const p = playbooks.find((x) => x.نام_پلی_بوک === name); return <button key={name} onClick={() => p && onOpen(p)}>{name}</button>; })}</div></div>)}</div></section></div>;
}

function Gaps({ playbooks, onOpen }: { playbooks: Playbook[]; onOpen: (p: Playbook) => void }) {
 const groups = [{ name: "داریم", tone: "green", items: playbooks.filter((p) => p.برچسب_داریم_لازم === "داریم") }, { name: "لازم", tone: "amber", items: playbooks.filter((p) => p.برچسب_داریم_لازم === "لازم") }, { name: "توسعه", tone: "purple", items: playbooks.filter((p) => p.برچسب_توسعه === "توسعه") }];
 return <div className="content"><p className="intro">این نما مرز بین دارایی‌های حاضر، شکاف‌های لازم و اقلام در حال توسعه را نشان می‌دهد.</p><div className="gap-columns">{groups.map((group) => <section className={`gap-col ${group.tone}`} key={group.name}><header><span>{group.name}</span><b>{group.items.length}</b></header><div>{group.items.map((p) => <button key={p.id} onClick={() => onOpen(p)}><small>#{p.id}</small><strong>{p.نام_پلی_بوک}</strong><span>{p.دامنه}</span></button>)}</div></section>)}</div></div>;
}

function Learning({ sessions }: { sessions: { جلسه: number; عنوان: string; هدف: string; خروجی: string }[] }) { return <div className="content"><div className="learning"><div className="learn-copy"><span className="eyebrow">HEGAM LEARNING PATH</span><h2>از خواندن دانش<br/>تا <em>خلق دارایی.</em></h2><p>۹ جلسه، برای تبدیل اعضای کاسیو‌پلاس از کاربر پایه به معمار دانش و آمادهٔ اتوماسیون.</p></div><div className="session-list">{sessions.map((s) => <article key={s.جلسه}><span>{String(s.جلسه).padStart(2,"0")}</span><div><h3>{s.عنوان}</h3><p>{s.هدف}</p><small>خروجی: {s.خروجی}</small></div></article>)}</div></div></div>; }

function PlaybookDrawer({ playbook, onClose }: { playbook: Playbook; onClose: () => void }) { return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="drawer" onMouseDown={(e) => e.stopPropagation()}><button className="close" onClick={onClose}>×</button><span className="eyebrow">PLAYBOOK #{String(playbook.id).padStart(2,"0")}</span><h2>{playbook.نام_پلی_بوک}</h2><div className="badges"><Badge tone={playbook.برچسب_داریم_لازم === "داریم" ? "green" : "amber"}>{playbook.برچسب_داریم_لازم}</Badge>{playbook.برچسب_توسعه && <Badge tone="purple">توسعه</Badge>}<Badge>{playbook.سطح_هگام}</Badge></div><Detail label="دامنه" value={playbook.دامنه ?? "—"}/><Detail label="خروجی کلیدی" value={playbook.خروجی_های_کلیدی}/><Detail label="مثال اجرایی" value={playbook.مثال_اجرایی}/><Detail label="مسیر بازگشت داده" value={playbook.مسیر_بازگشت_داده}/>{playbook.وابستگی_ها?.length ? <Detail label="وابستگی‌ها" value={playbook.وابستگی_ها.join(" • ")}/> : null}</aside></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <section className="detail"><span>{label}</span><p>{value}</p></section>; }

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
