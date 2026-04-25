export default async function handler(req, res) {
  try {
    const { title, price, booking_id } = req.body;

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [
          {
            title,
            quantity: 1,
            unit_price: Number(price)
          }
        ],
        external_reference: booking_id
      })
    });

    const data = await response.json();

    res.status(200).json({
      init_point: data.init_point
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}
