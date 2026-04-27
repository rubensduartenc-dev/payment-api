export default async function handler(req, res) {
  try {
    const { code, state } = req.query;

    // 🔒 Validação básica
    if (!code || !state) {
      return res.status(400).json({
        error: "Missing code or state"
      });
    }

    // 🔑 Credenciais
    const CLIENT_ID = process.env.MP_CLIENT_ID;
    const CLIENT_SECRET = process.env.MP_CLIENT_SECRET;
    const BASE44_API_KEY = process.env.BASE44_API_KEY;

    if (!CLIENT_ID || !CLIENT_SECRET || !BASE44_API_KEY) {
      return res.status(500).json({
        error: "Missing environment variables"
      });
    }

    const REDIRECT_URI = "https://payment-api-brown.vercel.app/api/oauth/callback";

    // 🔁 Troca o code pelo token
    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
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

    const data = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(500).json({
        error: "Erro ao trocar token",
        details: data
      });
    }

    // 📌 ID do profissional (veio no state)
    const profissionalId = state;

    // 🔥 SALVAR NO BASE44
    const saveResponse = await fetch(
      `https://base44.app/api/apps/SEU_APP_ID/collections/profissionais/${profissionalId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BASE44_API_KEY}`
        },
        body: JSON.stringify({
          mp_access_token: data.access_token,
          mp_refresh_token: data.refresh_token,
          mp_user_id: data.user_id,
          mp_conectado: true
        })
      }
    );

    if (!saveResponse.ok) {
      const err = await saveResponse.text();
      return res.status(500).json({
        error: "Erro ao salvar no Base44",
        details: err
      });
    }

    // ✅ REDIRECIONAMENTO CORRETO (PROFISSIONAL)
    return res.redirect(
      `https://beautyglow-br.base44.app/profissional/perfil`
    );

  } catch (error) {
    return res.status(500).json({
      error: "Erro interno",
      details: error.message
    });
  }
}
