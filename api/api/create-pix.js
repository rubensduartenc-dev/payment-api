export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { title, price, email } = req.body;

    const response = await fetch(
      "https://api.mercadopago.com/v1/payments",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_amount: Number(price),
          description: title,
          payment_method_id: "pix",

          payer: {
            email: email || "teste@email.com"
          }
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        error: "Erro ao criar PIX",
        details: data,
      });
    }

    return res.status(200).json({
      qr_code: data.point_of_interaction.transaction_data.qr_code,
      qr_code_base64:
        data.point_of_interaction.transaction_data.qr_code_base64,
      payment_id: data.id,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
