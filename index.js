import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

async function lsGet(endpoint, params = "") {
  const sep = params ? "&" : "";
  const res = await fetch(`/api/ls?endpoint=${endpoint}${sep}${params}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function fmt(n) {
  return "£" + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, sub, color = "#00e5a0", icon }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: "24px 28px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{sub}</div>}
      <div style={{ position: "absolute", right: -20, bottom: -20, width: 80, height: 80, borderRadius: "50%", background: color, opacity: 0.07 }} />
    </div>
  );
}

function Table({ headers, rows, emptyMsg = "Không có dữ liệu" }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ textAlign: "left", padding: "12px 16px", color: "rgba(255,255,255,0.35)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={headers.length} style={{ padding: "24px 16px", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>{emptyMsg}</td></tr>
            : rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: "12px 16px", color: "rgba(255,255,255,0.75)" }}>{cell}</td>
                ))}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

function Badge({ text, color }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 11 }}>{text}</span>;
}

const TABS = [
  { id: "overview", label: "📊 Overview" },
  { id: "sales", label: "💰 Sales" },
  { id: "products", label: "📦 Products" },
  { id: "customers", label: "👥 Customers" },
  { id: "inventory", label: "🗂 Inventory" },
];

export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({});
  const [lastFetch, setLastFetch] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const nowISO = now.toISOString();

      const enc = encodeURIComponent;

      const [salesMonth, salesToday, items, customers, categories] = await Promise.allSettled([
        lsGet("Sale.json", `completed=true&timeStamp=${enc(">,")}${enc(startOfMonth)}&limit=100`),
        lsGet("Sale.json", `completed=true&timeStamp=${enc("><,")}${enc(startOfDay)},${enc(nowISO)}&limit=50`),
        lsGet("Item.json", `limit=100&orderby=createTime&orderby_desc=true`),
        lsGet("Customer.json", `limit=50&orderby=createTime&orderby_desc=true`),
        lsGet("Category.json", `limit=50`),
      ]);

      const get = (r) => r.status === "fulfilled" ? r.value : null;
      setData({ salesMonth: get(salesMonth), salesToday: get(salesToday), items: get(items), customers: get(customers), categories: get(categories) });
      setLastFetch(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toArr = (v) => !v ? [] : Array.isArray(v) ? v : [v];

  const monthlySales = toArr(data.salesMonth?.Sale);
  const todaySales = toArr(data.salesToday?.Sale);
  const items = toArr(data.items?.Item);
  const customers = toArr(data.customers?.Customer);
  const categories = toArr(data.categories?.Category);

  const monthRevenue = monthlySales.reduce((s, x) => s + parseFloat(x.calcTotal || 0), 0);
  const todayRevenue = todaySales.reduce((s, x) => s + parseFloat(x.calcTotal || 0), 0);
  const totalItems = data.items?.["@attributes"]?.count || items.length;
  const totalCustomers = data.customers?.["@attributes"]?.count || customers.length;
  const totalSalesMonth = data.salesMonth?.["@attributes"]?.count || monthlySales.length;

  return (
    <>
      <Head>
        <title>ACE Nails Supply — Dashboard</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", background: "#080810", color: "#fff", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, background: "rgba(8,8,16,0.9)", backdropFilter: "blur(16px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#00e5a0,#00b4ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💅</div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18 }}>ACE Nails Supply</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Lightspeed Retail · acenailssupplyltd</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {lastFetch && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Cập nhật {lastFetch.toLocaleTimeString("vi-VN")}</div>}
            <button onClick={fetchAll} disabled={loading} style={{ background: "rgba(0,229,160,0.12)", border: "1px solid rgba(0,229,160,0.25)", color: "#00e5a0", borderRadius: 8, padding: "8px 18px", fontSize: 12, cursor: "pointer" }}>
              {loading ? "⟳ Đang tải..." : "↻ Refresh"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, padding: "14px 32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "transparent", border: "none", borderBottom: tab === t.id ? "2px solid #00e5a0" : "2px solid transparent", color: tab === t.id ? "#00e5a0" : "rgba(255,255,255,0.38)", padding: "10px 18px", fontSize: 13, cursor: "pointer", fontWeight: tab === t.id ? 600 : 400, transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "32px" }}>

          {error && (
            <div style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, color: "#ff8080", fontSize: 13 }}>
              ⚠️ Lỗi API: {error}
            </div>
          )}

          {loading && !Object.keys(data).length && (
            <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.25)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⟳</div>
              <div>Đang kết nối Lightspeed...</div>
            </div>
          )}

          {/* OVERVIEW */}
          {tab === "overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 32 }}>
                <StatCard label="Doanh thu hôm nay" value={fmt(todayRevenue)} sub={`${todaySales.length} đơn`} color="#00e5a0" icon="📈" />
                <StatCard label="Doanh thu tháng" value={fmt(monthRevenue)} sub={`${totalSalesMonth} đơn`} color="#00b4ff" icon="💰" />
                <StatCard label="Sản phẩm" value={totalItems} sub="trong hệ thống" color="#a78bfa" icon="📦" />
                <StatCard label="Khách hàng" value={totalCustomers} sub="đã đăng ký" color="#fb923c" icon="👥" />
              </div>

              <div style={{ marginBottom: 12, fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Đơn hàng hôm nay</div>
              <Table
                headers={["Mã đơn", "Giờ", "Khách", "Tổng", "Trạng thái"]}
                rows={todaySales.slice(0, 15).map(s => [
                  `#${s.saleID}`,
                  new Date(s.timeStamp).toLocaleTimeString("vi-VN"),
                  s.customerID !== "0" ? `#${s.customerID}` : "Walk-in",
                  fmt(s.calcTotal),
                  <Badge text="Hoàn thành" color="#00e5a0" />
                ])}
                emptyMsg="Chưa có đơn hàng hôm nay"
              />

              <div style={{ marginTop: 24, marginBottom: 12, fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Danh mục</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {categories.map((c, i) => (
                  <span key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 14px", fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{c.name}</span>
                ))}
              </div>
            </>
          )}

          {/* SALES */}
          {tab === "sales" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 28 }}>
                <StatCard label="Tháng này" value={fmt(monthRevenue)} sub={`${totalSalesMonth} đơn`} color="#00b4ff" icon="💰" />
                <StatCard label="Hôm nay" value={fmt(todayRevenue)} sub={`${todaySales.length} đơn`} color="#00e5a0" icon="📈" />
                <StatCard label="Trung bình/đơn" value={fmt(monthlySales.length ? monthRevenue / monthlySales.length : 0)} sub="tháng này" color="#a78bfa" icon="📊" />
              </div>
              <div style={{ marginBottom: 12, fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Tất cả đơn hàng tháng này</div>
              <Table
                headers={["Mã đơn", "Ngày", "Khách hàng", "Tổng tiền", "Trạng thái"]}
                rows={monthlySales.map(s => [
                  `#${s.saleID}`,
                  new Date(s.timeStamp).toLocaleDateString("vi-VN"),
                  s.customerID !== "0" ? `Khách #${s.customerID}` : "Walk-in",
                  fmt(s.calcTotal),
                  <Badge text="Hoàn thành" color="#00e5a0" />
                ])}
                emptyMsg="Không có dữ liệu"
              />
            </>
          )}

          {/* PRODUCTS */}
          {tab === "products" && (
            <>
              <div style={{ marginBottom: 12, fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Sản phẩm ({totalItems} tổng)</div>
              <Table
                headers={["Tên sản phẩm", "SKU", "Giá bán", "Danh mục", "Trạng thái"]}
                rows={items.map(item => [
                  item.description,
                  item.customSku || item.systemSku || "—",
                  item.Prices?.ItemPrice ? fmt(Array.isArray(item.Prices.ItemPrice) ? item.Prices.ItemPrice[0]?.amount : item.Prices.ItemPrice?.amount) : "—",
                  item.Category?.name || "—",
                  <Badge text={item.archived === "false" ? "Active" : "Archived"} color={item.archived === "false" ? "#00e5a0" : "#ff8080"} />
                ])}
                emptyMsg="Không có sản phẩm"
              />
            </>
          )}

          {/* CUSTOMERS */}
          {tab === "customers" && (
            <>
              <div style={{ marginBottom: 12, fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Khách hàng ({totalCustomers} tổng)</div>
              <Table
                headers={["Tên", "Email", "Điện thoại", "Ngày đăng ký"]}
                rows={customers.map(c => {
                  const emails = c.Contact?.Emails?.ContactEmail;
                  const phones = c.Contact?.Phones?.ContactPhone;
                  const email = Array.isArray(emails) ? emails[0]?.address : emails?.address;
                  const phone = Array.isArray(phones) ? phones[0]?.number : phones?.number;
                  return [
                    `${c.firstName || ""} ${c.lastName || ""}`.trim() || "—",
                    email || "—",
                    phone || "—",
                    new Date(c.createTime).toLocaleDateString("vi-VN"),
                  ];
                })}
                emptyMsg="Không có khách hàng"
              />
            </>
          )}

          {/* INVENTORY */}
          {tab === "inventory" && (
            <>
              <div style={{ marginBottom: 12, fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Tồn kho hiện tại</div>
              <Table
                headers={["Tên sản phẩm", "SKU", "Số lượng", "Danh mục"]}
                rows={items.map(item => [
                  item.description,
                  item.customSku || item.systemSku || "—",
                  <span style={{ color: parseInt(item.ItemShops?.ItemShop?.qoh || 0) <= 0 ? "#ff8080" : "#00e5a0", fontWeight: 600 }}>
                    {item.ItemShops?.ItemShop?.qoh || "0"}
                  </span>,
                  item.Category?.name || "—",
                ])}
                emptyMsg="Không có dữ liệu tồn kho"
              />
            </>
          )}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080810; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>
    </>
  );
}
