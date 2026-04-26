export default async function handler(req, res) {
  const body = req.body;

  if (body.type === "payment") {
    const paymentId = body.data.id;

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = await response.json();

    if (payment.status === "approved") {
      console.log("PIX pago!");

      // 👉 liberar serviço aqui
    }
  }

  res.status(200).send("ok");
}
