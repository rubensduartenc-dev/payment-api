export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { title, price, booking_id } = req.body;

    if (!title || !price) {
      return res.status(400).json({ error: "Dados obrigatórios faltando" });
    }

    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              title: title,
              quantity: 1,
              unit_price: Number(price),
              currency_id: "BRL",
            },
          ],

          external_reference: booking_id || "sem-id",

          payment_methods: {
            excluded_payment_types: [],
            excluded_payment_methods: [],
            installments: 1,
          },

          back_urls: {
            success: "https://seusite.com/sucesso",
            failure: "https://seusite.com/erro",
            pending: "https://seusite.com/pendente",
          },

          auto_return: "approved",

          notification_url:
            "https://seu-projeto.vercel.app/api/webhook",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "Erro ao criar pagamento",
        details: data,
      });
    }

    return res.status(200).json({
      init_point: data.init_point,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro interno",
      message: error.message,
    });
  }
}
