export default async function handler(req, res) {
  try {
    const { code, state } = req.query;

    // validações básicas
    if (!code) {
      return res.status(400).send("Código não recebido");
    }

    if (!state) {
      return res.status(400).send("Profissional não identificado");
    }

    // troca o code por token
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

    // log para validação (Vercel)
    console.log("=================================");
    console.log("PROFISSIONAL ID:", state);
    console.log("ACCESS TOKEN:", data.access_token);
    console.log("REFRESH TOKEN:", data.refresh_token);
    console.log("MP USER ID:", data.user_id);
    console.log("=================================");

    // 🔴 IMPORTANTE: ainda não estamos salvando no banco
    // isso é o próximo passo

    // redireciona de volta pro app
    return res.redirect(
      `https://beautyglow-br.base44.app/profissional?mp=connected`
    );

  } catch (error) {
    console.error("ERRO OAUTH:", error);
    return res.status(500).json({ error: error.message });
  }
}
