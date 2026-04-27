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

    console.log("profissionalId:", profissionalId);
    console.log("mpData:", mpData);

    // 🔥 CHAMA FUNÇÃO DO BASE44 (CORRETO)
    const base44Response = 
      await fetch( "https://beautyglow-br.base44.app/functions/adminAction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_key": process.env.BASE44_API_KEY
        },
        body: JSON.stringify({
          action: "update_mp",
          target_type: "professional",
          target_id: profissionalId,
          data: {
            mp_access_token: mpData.access_token,
            mp_refresh_token: mpData.refresh_token,
            mp_user_id: String(mpData.user_id || ""),
            mp_connected: true
          }
        })
      }
    );

    const base44Data = await base44Response.json();

    console.log("BASE44 STATUS:", base44Response.status);
    console.log("BASE44 RESPONSE:", base44Data);

    if (!base44Response.ok) {
      return res.status(500).json({
        error: "Erro ao salvar no Base44",
        details: base44Data
      });
    }

    // ✅ SUCESSO → redireciona
    return res.redirect(
      "https://beautyglow-br.base44.app/profissional/perfil"
    );

  } catch (error) {
    return res.status(500).json({
      error: "Erro interno",
      details: error.message
    });
  }
}
