export default async function handler(req, res) {
  try {
    const { title, price, email, profissional } = req.body;

    // 🔴 PEGAR TOKEN DO PROFISSIONAL (simulação por enquanto)
    const accessToken = profissional.mp_access_token;

    // 🔴 DEFINIR COMISSÃO
    const isClienteProprio = false; // depois vem do seu sistema
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
            unit_price: Number(price)
          }
        ],
        payer: {
          email: email
        },
        application_fee: Number(applicationFee)
      })
    });

    const data = await response.json();

    return res.status(200).json({
      init_point: data.init_point
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
