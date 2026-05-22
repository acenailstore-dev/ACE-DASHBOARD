export default async function handler(req, res) {
      const { endpoint, ...queryParams } = req.query;
      if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

  const TOKEN = process.env.LS_TOKEN;

  // Step 1: Auto-discover numeric Account ID
  let accountID = null;
      try {
              const accRes = await fetch("https://api.lightspeedapp.com/API/V3/Account.json", {
                        headers: { "Authorization": `Bearer ${TOKEN}`, "Accept": "application/json" },
              });
              if (accRes.ok) {
                        const accData = await accRes.json();
                        const acc = accData.Account;
                        accountID = Array.isArray(acc) ? acc[0]?.accountID : acc?.accountID;
              } else {
                        const errText = await accRes.text();
                        return res.status(accRes.status).json({ error: "Account lookup failed", details: errText });
              }
      } catch (e) {
              return res.status(500).json({ error: "Account lookup error", details: e.message });
      }

  // Step 2: Call the requested endpoint
  const endpointStr = Array.isArray(endpoint) ? endpoint.join("/") : endpoint;
      const params = new URLSearchParams(queryParams).toString();
      const url = `https://api.lightspeedapp.com/API/V3/Account/${accountID}/${endpointStr}${params ? "?" + params : ""}`;

  try {
          const lsRes = await fetch(url, {
                    headers: { "Authorization": `Bearer ${TOKEN}`, "Accept": "application/json" },
          });
          const text = await lsRes.text();
          if (!lsRes.ok) return res.status(lsRes.status).json({ error: lsRes.status, details: text });
          res.setHeader("Cache-Control", "s-maxage=60");
          res.status(200).json(JSON.parse(text));
  } catch (err) {
          res.status(500).json({ error: err.message });
  }
}
