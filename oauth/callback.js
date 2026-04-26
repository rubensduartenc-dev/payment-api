export default async function handler(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send("Código não recebido");
    }

    const response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.MP_CLIENT_ID,
        client_secret: process.env.MP_CLIENT_SECRET,
        code: code,
        redirect_uri: "https://payment-api-brown.vercel.app/api/oauth/callback"
      })
    });

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
