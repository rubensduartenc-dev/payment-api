export default async function handler(req, res) {
  try {
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [
          {
            title: "Teste BeautyGlow",
            quantity: 1,
            unit_price: 10
          }
        ]
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
