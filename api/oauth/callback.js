export default async function handler(req, res) {
  try {
    const { code, state } = req.query;

    // 🔒 Validação básica
    if (!code || !state) {
      return res.status(400).json({
        error: "Missing code or state"
      });
    }

    // 🔑 Credenciais do Mercado Pago (vindas do Base44 ENV)
    const CLIENT_ID = process.env.MP_CLIENT_ID;
    const CLIENT_SECRET = process.env.MP_CLIENT_SECRET;

    // ⚠️ IMPORTANTE: essa URL tem que ser exatamente a mesma cadastrada no Mercado Pago
    const REDIRECT_URI = "https://payment-api-brown.vercel.app/api/oauth/callback";

    // 🔁 Troca o "code" pelo access_token
    const response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI
      })
    });

    const data = await response.json();

    // ❌ Se der erro no Mercado Pago
    if (!response.ok) {
      return res.status(500).json({
        error: "Erro ao trocar token",
        details: data
      });
    }

    // 📌 Aqui está o ponto MAIS IMPORTANTE:
    // "state" = ID do profissional no seu banco
    const profissionalId = state;

    // 🔥 SALVA no Base44
    await fetch(`https://base44.app/api/apps/YOUR_APP_ID/collections/profissionais/${profissionalId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.BASE44_API_KEY}`
      },
      body: JSON.stringify({
        mp_access_token: data.access_token,
        mp_refresh_token: data.refresh_token,
        mp_user_id: data.user_id,
        mp_conectado: true
      })
    });

    // ✅ Redireciona de volta pro app
    return res.redirect("https://beautyglow-br.base44.app/perfil?mp=conectado");

  } catch (error) {
    return res.status(500).json({
      error: "Erro interno",
      details: error.message
    });
  }
}
