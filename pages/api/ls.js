export default async function handler(req, res) {
  const { endpoint, ...queryParams } = req.query;
  if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

  const ACCOUNT = "acenailssupplyltd";
  const TOKEN = process.env.LS_TOKEN;

  const endpointStr = Array.isArray(endpoint) ? endpoint.join("/") : endpoint;
  const params = new URLSearchParams(queryParams).toString();
  const url = `https://api.lightspeedapp.com/API/V3/Account/${ACCOUNT}/${endpointStr}${params ? "?" + params : ""}`;

  const credentials = Buffer.from(`${TOKEN}:${TOKEN}`).toString("base64");

  try {
    const lsRes = await fetch(url, {
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Accept": "application/json",
      },
    });

    const text = await lsRes.text();
    console.log("Status:", lsRes.status, "URL:", url);

    if (!lsRes.ok) {
      return res.status(lsRes.status).json({ error: lsRes.status, details: text });
    }

    res.setHeader("Cache-Control", "s-maxage=60");
    res.status(200).json(JSON.parse(text));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
