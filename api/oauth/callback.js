export default async function handler(req, res) {
  try {
    const { code, state } = req.query;

    // 🔒 Validação básica
    if (!code || !state) {
      return res.status(400).json({
        error: "Missing code or state"
      });
    }

    // 🔑 ENV
    const CLIENT_ID = process.env.MP_CLIENT_ID;
    const CLIENT_SECRET = process.env.MP_CLIENT_SECRET;
    const BASE44_API_KEY = process.env.BASE44_API_KEY;

    if (!CLIENT_ID || !CLIENT_SECRET || !BASE44_API_KEY) {
      return res.status(500).json({
        error: "Missing environment variables"
      });
    }

    const REDIRECT_URI = "https://payment-api-brown.vercel.app/api/oauth/callback";

    // 🔁 Troca code por token
    const mpResponse = await fetch("https://api.mercadopago.com/oauth/token", {
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

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(500).json({
        error: "Erro ao trocar token",
        details: mpData
      });
    }

    // 📌 ID do profissional (vem do state)
    const profissionalId = state;

    // 🔥 SALVAR NO BASE44 (CORRIGIDO)
    const base44Response = await fetch(
      `https://base44.app/api/apps/69e592159a2bb27bdd7c158a/entities/profissional/${profissionalId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BASE44_API_KEY}`
        },
        body: JSON.stringify({
          mp_access_token: mpData.access_token,
          mp_refresh_token: mpData.refresh_token,
          mp_user_id: mpData.user_id,
          mp_conectado: true
        })
      }
    );

    const base44Data = await base44Response.json();

    if (!base44Response.ok) {
      return res.status(500).json({
        error: "Erro ao salvar no Base44",
        details: base44Data
      });
    }

    // ✅ SUCESSO → redireciona
    return res.redirect("https://beautyglow-br.base44.app/profissional/perfil");

  } catch (error) {
    return res.status(500).json({
      error: "Erro interno",
      details: error.message
    });
  }
}
