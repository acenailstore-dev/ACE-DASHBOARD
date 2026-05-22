export default async function handler(req, res) {
        const { endpoint, ...queryParams } = req.query;
        if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

  const TOKEN = process.env.LS_TOKEN;
        const DOMAIN = "acenailssupplyltd";

  // Lightspeed Retail (new platform) API at lightspeedhq.com
  const endpointStr = Array.isArray(endpoint) ? endpoint.join("/") : endpoint;
        const params = new URLSearchParams(queryParams).toString();
        const url = `https://api.lightspeedhq.com/retail/2.0/${endpointStr}${params ? "?" + params : ""}`;

  try {
            const lsRes = await fetch(url, {
                        headers: {
                                      "Authorization": `Bearer ${TOKEN}`,
                                      "Accept": "application/json",
                                      "X-Store-Domain": `${DOMAIN}.retail.lightspeed.app`,
                        },
            });
            const text = await lsRes.text();
            console.log("Status:", lsRes.status, "URL:", url);
            if (!lsRes.ok) {
                        return res.status(lsRes.status).json({ error: lsRes.status, url, details: text });
            }
            res.setHeader("Cache-Control", "s-maxage=60");
            res.status(200).json(JSON.parse(text));
  } catch (err) {
            res.status(500).json({ error: err.message });
  }
}
