export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try {
    const { title, price, email } = req.body;

    // Validação mínima
    if (!title || !price) {
      return res.status(400).json({
        erro: "Dados inválidos",
        mensagem: "title e price são obrigatórios",
      });
    }

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${Date.now()}-${Math.random()}`
      },
      body: JSON.stringify({
        transaction_amount: Number(price),
        description: title,
        payment_method_id: "pix",
        payer: {
          email: email || "test@test.com",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        erro: "Erro ao criar PIX",
        detalhes: data,
      });
    }

    return res.status(200).json({
      qr_code: data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
      payment_id: data.id,
    });

  } catch (error) {
    return res.status(500).json({
      erro: "Erro interno",
      detalhes: error.message,
    });
  }
}
