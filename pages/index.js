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

function fmt(n) { return "\u00a3" + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(iso) { if (!iso) return "-"; return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); }
function fmtDatetime(iso) { if (!iso) return "-"; return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

function StatCard({ label, value, sub, color = "#00e5a0", icon }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px 28px" }}>
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

const TABS = [{ id: "overview", label: "\ud83d\udcca Tong quan" }, { id: "sales", label: "\ud83d\udcb0 Doanh so" }, { id: "products", label: "\ud83d\udce6 San pham" }, { id: "customers", label: "\ud83d\udc65 Khach hang" }];

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
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const [salesRes, prRes, cuRes] = await Promise.allSettled([
        lsQuery(`{ sales(first: 500, orderBy: { field: SALE_DATE, direction: DESC }) { sales { id saleDate invoiceNumber totalPrice { amount } totalTax { amount } customer { firstName lastName } } pageInfo { hasNextPage } } }`),
        lsQuery(`{ products(first: 50) { products { id name sku isActive priceIncludingTax { amount } hasInventory } totalCount } }`),
        lsQuery(`{ customers(first: 50) { customers { id firstName lastName companyName createdAt contact { email phone } } totalCount } }`),
      ]);

      const get = r => r.status === "fulfilled" ? r.value : null;
      const allSales = get(salesRes)?.sales?.sales || [];

      // Filter in JS by date (API filter is unreliable)
      const monthlySales = allSales.filter(s => new Date(s.saleDate).getTime() >= startOfMonth);
      const todaySales = allSales.filter(s => new Date(s.saleDate).getTime() >= startOfDay);

      setData({
        allSales,
        monthlySales,
        todaySales,
        hasMoreMonth: get(salesRes)?.sales?.pageInfo?.hasNextPage,
        products: get(prRes),
        customers: get(cuRes)
      });
      setLastFetch(new Date());
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const ms = data.monthlySales || [];
  const ts = data.todaySales || [];
  const prods = data.products?.products?.products || [];
  const custs = data.customers?.customers?.customers || [];
  const totProd = data.products?.products?.totalCount || 0;
  const totCust = data.customers?.customers?.totalCount || 0;
  const mRev = ms.reduce((s, x) => s + parseFloat(x.totalPrice?.amount || 0), 0);
  const mTax = ms.reduce((s, x) => s + parseFloat(x.totalTax?.amount || 0), 0);
  const tRev = ts.reduce((s, x) => s + parseFloat(x.totalPrice?.amount || 0), 0);
  const cn = c => { if (!c) return "Khach le"; const n = [c.firstName, c.lastName].filter(Boolean).join(" ").trim(); return n || c.companyName || "Khach le"; };
  const tabStyle = id => ({ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 600 : 400, background: tab === id ? "rgba(0,229,160,0.12)" : "transparent", color: tab === id ? "#00e5a0" : "rgba(255,255,255,0.4)", whiteSpace: "nowrap" });
  const now = new Date();
  const mn = now.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  return (
    <>
      <Head><title>ACE Nails Dashboard</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0e1a,#0d1527,#0a1020)", color: "#fff", fontFamily: "Inter,-apple-system,sans-serif", paddingBottom: 60 }}>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.25)", position: "sticky", top: 0, zIndex: 100 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>\ud83d\udc85 ACE Nails Supply</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{lastFetch ? `Cap nhat: ${fmtDatetime(lastFetch)}` : "Dang tai..."}</div>
          </div>
          <button onClick={fetchAll} disabled={loading} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(0,229,160,0.3)", background: "rgba(0,229,160,0.1)", color: "#00e5a0", cursor: loading ? "wait" : "pointer", fontSize: 13 }}>{loading ? "Dang tai..." : "\u21bb Lam moi"}</button>
        </div>
        {error && <div style={{ margin: "16px 28px", padding: "12px 16px", borderRadius: 8, background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff6060", fontSize: 13 }}>Loi: {error}</div>}
        <div style={{ display: "flex", gap: 4, padding: "14px 28px", borderBottom: "1px solid rgba(255,255,255,0.05)", overflowX: "auto" }}>
          {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(t.id)}>{t.label}</button>)}
        </div>
        <div style={{ padding: 28 }}>
          {tab === "overview" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
              <StatCard icon="\ud83d\udcc5" label={"Doanh thu " + mn} value={loading ? "..." : fmt(mRev)} sub={ms.length + " don"} color="#00e5a0" />
              <StatCard icon="\u2600\ufe0f" label="Hom nay" value={loading ? "..." : fmt(tRev)} sub={ts.length + " don"} color="#4fc3f7" />
              <StatCard icon="\ud83d\udc65" label="Khach hang" value={loading ? "..." : totCust.toLocaleString()} sub="tong cong" color="#ce93d8" />
              <StatCard icon="\ud83d\udce6" label="San pham" value={loading ? "..." : totProd.toLocaleString()} sub="trong danh muc" color="#ffb74d" />
            </div>
            <div style={{ marginBottom: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Don hang hom nay ({ts.length} don)</div>
            <Table headers={["Hoa don","Gio","Khach hang","Tong tien"]} rows={ts.map(s => ["#"+(s.invoiceNumber||"-"), fmtDatetime(s.saleDate), cn(s.customer), fmt(s.totalPrice?.amount)])} />
          </>}
          {tab === "sales" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
              <StatCard icon="\ud83d\udcb7" label={"Tong " + mn} value={loading ? "..." : fmt(mRev)} sub={ms.length + " giao dich"} color="#00e5a0" />
              <StatCard icon="\ud83e\uddf3" label="Thue VAT" value={loading ? "..." : fmt(mTax)} sub="thang nay" color="#ef9a9a" />
              <StatCard icon="\u2248" label="TB / don" value={loading ? "..." : fmt(ms.length ? mRev/ms.length : 0)} sub="trung binh" color="#4fc3f7" />
              <StatCard icon="\u2600\ufe0f" label="Hom nay" value={loading ? "..." : fmt(tRev)} sub={ts.length + " don"} color="#a5d6a7" />
            </div>
            <div style={{ marginBottom: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Chi tiet thang ({ms.length} don)</div>
            <Table headers={["Hoa don","Ngay gio","Khach hang","Tong tien","Thue"]} rows={ms.map(s => ["#"+(s.invoiceNumber||"-"), fmtDatetime(s.saleDate), cn(s.customer), fmt(s.totalPrice?.amount), fmt(s.totalTax?.amount)])} />
            {data.hasMoreMonth && <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>* Con nhieu don hon, can tang gioi han</div>}
          </>}
          {tab === "products" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
              <StatCard icon="\ud83d\udce6" label="Tong san pham" value={loading ? "..." : totProd.toLocaleString()} sub="trong he thong" color="#ffb74d" />
              <StatCard icon="\u2705" label="Dang ban" value={loading ? "..." : prods.filter(p=>p.isActive).length} sub={"trong " + prods.length} color="#00e5a0" />
              <StatCard icon="\u274c" label="Ngung ban" value={loading ? "..." : prods.filter(p=>!p.isActive).length} sub="san pham" color="#ef9a9a" />
            </div>
            <div style={{ marginBottom: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Danh sach san pham (50 dau)</div>
            <Table headers={["Ten san pham","SKU","Gia","Trang thai","Kho"]} rows={prods.map(p => [p.name, p.sku||"-", fmt(p.priceIncludingTax?.amount), p.isActive ? <Badge key="a" text="Dang ban" color="#00e5a0" /> : <Badge key="i" text="Ngung ban" color="#ef9a9a" />, p.hasInventory?"Co":"-"])} />
          </>}
          {tab === "customers" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
              <StatCard icon="\ud83d\udc65" label="Tong khach hang" value={loading ? "..." : totCust.toLocaleString()} sub="da dang ky" color="#ce93d8" />
              <StatCard icon="\ud83d\udcc4" label="Hien thi" value={loading ? "..." : custs.length} sub="khach hang" color="#4fc3f7" />
            </div>
            <div style={{ marginBottom: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Danh sach khach hang (50 moi nhat)</div>
            <Table headers={["Ho ten","Email","Dien thoai","Ngay tao"]} rows={custs.map(c => [cn(c), c.contact?.email||"-", c.contact?.phone||"-", fmtDate(c.createdAt)])} />
          </>}
        </div>
      </div>
    </>
  );
            }
