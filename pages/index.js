import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

async function lsQuery(query) {
  const res = await fetch('/api/ls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  if (json.error) throw new Error(json.details || json.error);
  return json.data;
}

function fmt(n) { return "£" + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(iso) { if (!iso) return "-"; return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); }
function fmtDatetime(iso) { if (!iso) return "-"; return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

function StatCard({ label, value, sub, color = "#00e5a0", icon }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px 28px", position: "relative", overflow: "hidden" }}>
      <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{sub}</div>}
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>{headers.map((h, i) => <th key={i} style={{ textAlign: "left", padding: "12px 16px", color: "rgba(255,255,255,0.35)", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{h}</th>)}</tr></thead>
        <tbody>{rows.length === 0 ? <tr><td colSpan={headers.length} style={{ padding: "24px", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>Khong co du lieu</td></tr> : rows.map((row, i) => <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{row.map((cell, j) => <td key={j} style={{ padding: "12px 16px", color: "rgba(255,255,255,0.75)" }}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Badge({ text, color }) { return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 11 }}>{text}</span>; }

const TABS = [{ id: "overview", label: "Tong quan" }, { id: "sales", label: "Doanh so" }, { id: "products", label: "San pham" }, { id: "customers", label: "Khach hang" }];

function toLocalDateStr(d) { const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T00:00:00`; }

export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({});
  const [lastFetch, setLastFetch] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const now = new Date();
      const som = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
      const sod = toLocalDateStr(now);
      const [smRes, sdRes, prRes, cuRes] = await Promise.allSettled([
        lsQuery(`{ sales(first: 100, filter: { saleDateFrom: "${som}" }) { sales { id saleDate invoiceNumber totalPrice { amount } totalTax { amount } customer { firstName lastName } } pageInfo { hasNextPage } } }`),
        lsQuery(`{ sales(first: 50, filter: { saleDateFrom: "${sod}" }) { sales { id saleDate invoiceNumber totalPrice { amount } customer { firstName lastName } } } }`),
        lsQuery(`{ products(first: 50) { products { id name sku isActive priceIncludingTax { amount } hasInventory } totalCount } }`),
        lsQuery(`{ customers(first: 50) { customers { id firstName lastName companyName createdAt contact { email phone } } totalCount } }`),
      ]);
      const get = r => r.status === "fulfilled" ? r.value : null;
      setData({ salesMonth: get(smRes), salesToday: get(sdRes), products: get(prRes), customers: get(cuRes) });
      setLastFetch(new Date());
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const ms = data.salesMonth?.sales?.sales || [];
  const ts = data.salesToday?.sales?.sales || [];
  const prods = data.products?.products?.products || [];
  const custs = data.customers?.customers?.customers || [];
  const totProd = data.products?.products?.totalCount || 0;
  const totCust = data.customers?.customers?.totalCount || 0;
  const mRev = ms.reduce((s, x) => s + parseFloat(x.totalPrice?.amount || 0), 0);
  const mTax = ms.reduce((s, x) => s + parseFloat(x.totalTax?.amount || 0), 0);
  const tRev = ts.reduce((s, x) => s + parseFloat(x.totalPrice?.amount || 0), 0);
  const cn = c => { if (!c) return "Khach le"; const n = [c.firstName, c.lastName].filter(Boolean).join(" ").trim(); return n || c.companyName || "Khach le"; };
  const ts2 = id => ({ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 600 : 400, background: tab === id ? "rgba(0,229,160,0.12)" : "transparent", color: tab === id ? "#00e5a0" : "rgba(255,255,255,0.4)", whiteSpace: "nowrap" });
  const now = new Date(); const mn = now.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  return (
    <>
      <Head><title>ACE Nails Dashboard</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0e1a,#0d1527,#0a1020)", color: "#fff", fontFamily: "Inter,-apple-system,sans-serif", paddingBottom: 60 }}>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.25)", position: "sticky", top: 0, zIndex: 100 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>ACE Nails Supply - Dashboard</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{lastFetch ? `Cap nhat: ${fmtDatetime(lastFetch)}` : "Dang tai..."}</div>
          </div>
          <button onClick={fetchAll} disabled={loading} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(0,229,160,0.3)", background: "rgba(0,229,160,0.1)", color: "#00e5a0", cursor: loading ? "wait" : "pointer", fontSize: 13 }}>{loading ? "Dang tai..." : "Lam moi"}</button>
        </div>
        {error && <div style={{ margin: "16px 28px", padding: "12px 16px", borderRadius: 8, background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff6060", fontSize: 13 }}>Loi: {error}</div>}
        <div style={{ display: "flex", gap: 4, padding: "14px 28px", borderBottom: "1px solid rgba(255,255,255,0.05)", overflowX: "auto" }}>
          {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={ts2(t.id)}>{t.label}</button>)}
        </div>
        <div style={{ padding: 28 }}>
          {tab === "overview" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
              <StatCard icon="£" label={"Doanh thu " + mn} value={loading ? "..." : fmt(mRev)} sub={ms.length + "+ don"} color="#00e5a0" />
              <StatCard icon="D" label="Hom nay" value={loading ? "..." : fmt(tRev)} sub={ts.length + " don"} color="#4fc3f7" />
              <StatCard icon="K" label="Khach hang" value={loading ? "..." : totCust.toLocaleString()} sub="tong cong" color="#ce93d8" />
              <StatCard icon="S" label="San pham" value={loading ? "..." : totProd.toLocaleString()} sub="trong danh muc" color="#ffb74d" />
            </div>
            <div style={{ marginBottom: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Don hang gan day</div>
            <Table headers={["Hoa don","Ngay gio","Khach hang","Tong tien"]} rows={ms.slice(0,15).map(s => ["#"+(s.invoiceNumber||"-"), fmtDatetime(s.saleDate), cn(s.customer), fmt(s.totalPrice?.amount)])} />
          </>}
          {tab === "sales" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
              <StatCard icon="£" label={"Tong thang " + (now.getMonth()+1)} value={loading ? "..." : fmt(mRev)} sub={ms.length + "+ giao dich"} color="#00e5a0" />
              <StatCard icon="T" label="Thue" value={loading ? "..." : fmt(mTax)} sub="VAT" color="#ef9a9a" />
              <StatCard icon="=" label="TB moi don" value={loading ? "..." : fmt(ms.length ? mRev/ms.length : 0)} sub="trung binh" color="#4fc3f7" />
              <StatCard icon="D" label="Hom nay" value={loading ? "..." : fmt(tRev)} sub={ts.length + " don"} color="#a5d6a7" />
            </div>
            <div style={{ marginBottom: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Chi tiet thang {now.getMonth()+1}/{now.getFullYear()}</div>
            <Table headers={["Hoa don","Ngay gio","Khach hang","Tong tien","Thue"]} rows={ms.map(s => ["#"+(s.invoiceNumber||"-"), fmtDatetime(s.saleDate), cn(s.customer), fmt(s.totalPrice?.amount), fmt(s.totalTax?.amount)])} />
            {data.salesMonth?.sales?.pageInfo?.hasNextPage && <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>* Hien thi 100 don dau tien</div>}
          </>}
          {tab === "products" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
              <StatCard icon="S" label="Tong san pham" value={loading ? "..." : totProd.toLocaleString()} sub="trong he thong" color="#ffb74d" />
              <StatCard icon="+" label="Dang ban" value={loading ? "..." : prods.filter(p=>p.isActive).length} sub={"trong " + prods.length} color="#00e5a0" />
              <StatCard icon="-" label="Ngung ban" value={loading ? "..." : prods.filter(p=>!p.isActive).length} sub="san pham" color="#ef9a9a" />
            </div>
            <div style={{ marginBottom: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Danh sach san pham (50 dau)</div>
            <Table headers={["Ten san pham","SKU","Gia","Trang thai","Kho"]} rows={prods.map(p => [p.name, p.sku||"-", fmt(p.priceIncludingTax?.amount), p.isActive ? <Badge key="a" text="Dang ban" color="#00e5a0" /> : <Badge key="i" text="Ngung ban" color="#ef9a9a" />, p.hasInventory?"Co":"-"])} />
          </>}
          {tab === "customers" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
              <StatCard icon="K" label="Tong khach hang" value={loading ? "..." : totCust.toLocaleString()} sub="da dang ky" color="#ce93d8" />
              <StatCard icon="N" label="Hien thi" value={loading ? "..." : custs.length} sub="khach hang" color="#4fc3f7" />
            </div>
            <div style={{ marginBottom: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Danh sach khach hang (50 moi nhat)</div>
            <Table headers={["Ho ten","Email","Dien thoai","Ngay tao"]} rows={custs.map(c => [cn(c), c.contact?.email||"-", c.contact?.phone||"-", fmtDate(c.createdAt)])} />
          </>}
        </div>
      </div>
    </>
  );
            }
