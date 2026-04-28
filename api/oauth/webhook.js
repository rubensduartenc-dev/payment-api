export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).send("OK");
    }

    if (req.method !== "POST") {
      return res.status(405).end();
    }

    const body = req.body;

    console.log("Webhook recebido:", JSON.stringify(body));

    if (!body || body.type !== "payment") {
      return res.status(200).end();
    }

    const paymentId = body.data?.id;

    if (!paymentId) {
      return res.status(200).end();
    }

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = await mpResponse.json();

    console.log("Pagamento:", payment);

    if (payment.status !== "approved") {
      return res.status(200).end();
    }

    const bookingId = payment.external_reference;

    if (!bookingId) {
      return res.status(200).end();
    }

    console.log("Atualizando booking:", bookingId);

    const updateResponse = await fetch("https://beautyglow-br.base44.app/functions/adminAction", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "api_key": process.env.BASE44_API_KEY,
  },
  body: JSON.stringify({
  action: "update",
  entity: "Booking",
  id: bookingId,
  data: {
    status: "confirmed"
  }
}),
});

const updateText = await updateResponse.text();

console.log("RESPOSTA BASE44:", updateText);

    return res.status(200).end();

  } catch (error) {
    console.error("Erro webhook:", error);
    return res.status(500).end();
  }
}
