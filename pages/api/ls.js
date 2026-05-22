export default async function handler(req, res) {
          const TOKEN = process.env.LS_TOKEN;
          const STORE = "acenailssupplyltd";
          const GQL_URL = `https://${STORE}.retail.lightspeed.app/api/graphql`;

  // Accept a GraphQL query in request body, or use a default one
  let body;
          if (req.method === 'POST' && req.body?.query) {
                      body = JSON.stringify(req.body);
          } else {
                      // Default: fetch sales summary for current month
            body = JSON.stringify({
                          operationName: 'FetchRuntimeDashboard',
                          variables: { userID: '020b2c2a-4661-11ef-e88b-f9cf7d519dc5' },
                          query: `query FetchRuntimeDashboard($userID: ID!) {
                                  retailer { id name timezone country }
                                          user(id: $userID) { displayName }
                                                }`
            });
          }

  try {
              const lsRes = await fetch(GQL_URL, {
                            method: 'POST',
                            headers: {
                                            'Authorization': `Bearer ${TOKEN}`,
                                            'Content-Type': 'application/json',
                                            'Accept': 'application/json',
                            },
                            body,
              });
              const text = await lsRes.text();
              console.log('Status:', lsRes.status, 'URL:', GQL_URL);
              if (!lsRes.ok) {
                            return res.status(lsRes.status).json({ error: lsRes.status, url: GQL_URL, details: text });
              }
              res.setHeader('Cache-Control', 's-maxage=30');
              res.status(200).json(JSON.parse(text));
  } catch (err) {
              res.status(500).json({ error: err.message, url: GQL_URL });
  }
}
