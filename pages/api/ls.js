export default async function handler(req, res) {
  const { endpoint } = req.query;
  if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

  const ACCOUNT = "acenailssupplyltd";
  const TOKEN = process.env.LS_TOKEN || "lsxs_pt_2uYBSADYBYwIORBWLgAOHWhHoH9sV7ut";

  const endpointStr = Array.isArray(endpoint) ? endpoint.join("/") : endpoint;
  const query = req.url.includes("?") ? "?" + req.url.split("?")[1].replace(/endpoint=[^&]+&?/, "").replace(/&$/, "") : "";

  const url = `https://api.lightspeedapp.com/API/V3/Account/${ACCOUNT}/${endpointStr}${query}`;

  try {
    const lsRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = await lsRes.json();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    res.status(lsRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
