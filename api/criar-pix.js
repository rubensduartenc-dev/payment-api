export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { title, price, email } = req.body;

    if (!title || !price || !email) {
      return res.status(400).json({ error: "Missing data" });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-Idempotency-Key": Date.now().toString()
      },
      body: JSON.stringify({
        transaction_amount: Number(price),
        description: title,
        payment_method_id: "pix",
        payer: {
          email: email
        }
      })
    });

    const data = await response.json();

    // 🔴 IMPORTANTE: trata erro do Mercado Pago
    if (!response.ok) {
      return res.status(response.status).json({
        error: "Erro Mercado Pago",
        details: data
      });
    }

    return res.status(200).json({
      qr_code: data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64
    });

  } catch (error) {
    console.error("ERRO REAL:", error);

    return res.status(500).json({
      error: "Erro interno",
      message: error.message
    });
  }
}
