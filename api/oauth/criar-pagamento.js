export default async function handler(req, res) {
  // 🔥 CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  export default async function handler(req, res) {
  try {
    const { title, price, email, profissional, bookingId } = req.body;

    // 🔐 Token do profissional
    const accessToken = profissional.mp_access_token;

    // 💰 Comissão
    const isClienteProprio = false; // depois vem do sistema
    const porcentagem = isClienteProprio ? 0.08 : 0.12;
    const applicationFee = price * porcentagem;

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [
          {
            title: title,
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(price)
          }
        ],
        payer: {
          email: email
        },

        // 🔥 ESSENCIAL
        external_reference: bookingId,

        // 🔔 WEBHOOK
        notification_url: "https://payment-api-brown.vercel.app/api/oauth/webhook",

        // 🔁 REDIRECIONAMENTO
        back_urls: {
          success: "https://beautyglow-br.base44.app/sucesso",
          failure: "https://beautyglow-br.base44.app/erro",
          pending: "https://beautyglow-br.base44.app/pendente"
        },
        auto_return: "approved",

        // 💸 SUA COMISSÃO
        application_fee: Number(applicationFee)
      })
    });

    const data = await response.json();

    return res.status(200).json({
      init_point: data.init_point
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
