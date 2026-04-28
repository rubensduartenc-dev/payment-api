export default async function handler(req, res) {
  // 🔥 CORS (precisa ficar fora do try)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { title, price, email, profissional, bookingId } = req.body;

    if (!profissional || !profissional.mp_access_token) {
      return res.status(400).json({
        error: "Profissional sem conta Mercado Pago conectada"
      });
    }

    if (!bookingId) {
      return res.status(400).json({
        error: "bookingId não enviado"
      });
    }

    // 🔐 Token do profissional (marketplace correto)
    const accessToken = profissional.mp_access_token;

    // 💰 Comissão
    const isClienteProprio = false;
    const porcentagem = isClienteProprio ? 0.08 : 0.12;
    const applicationFee = Number(price) * porcentagem;

    // 🔥 PREFERENCE CORRETA
    const preference = {
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

      // 🔥 CRÍTICO (liga pagamento ao booking)
      external_reference: bookingId,

      // 🔥 CRÍTICO (faz o webhook funcionar)
      notification_url: "https://payment-api-brown.vercel.app/api/oauth/webhook",

      back_urls: {
        success: "https://beautyglow-br.base44.app/sucesso",
        failure: "https://beautyglow-br.base44.app/erro",
        pending: "https://beautyglow-br.base44.app/pendente"
      },

      auto_return: "approved",

      // 💸 comissão da plataforma
      application_fee: Number(applicationFee)
    };

    console.log("PREFERENCE ENVIADA:", preference);

    // 🔥 ENVIO PARA O MERCADO PAGO
    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(preference)
      }
    );

    const data = await response.json();
    console.log("RESPOSTA MERCADO PAGO:", data);

    if (!response.ok) {
      console.error("Erro Mercado Pago:", data);
      return res.status(500).json({
        error: "Erro ao criar pagamento",
        details: data
      });
    }

    return res.status(200).json({
      init_point: data.init_point
    });

  } catch (error) {
    console.error("Erro geral:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}
