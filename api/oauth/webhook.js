export default async function handler(req, res) {
  try {

    // 🔥 permite teste no navegador
    if (req.method !== "POST") {
      return res.status(200).send("Webhook ativo");
    }

    // 🔥 parse seguro do body
    let body = {};

    try {
      body = typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;
    } catch (e) {
      console.error("Erro ao parsear body");
      return res.status(200).send("Body inválido");
    }

    console.log("Webhook recebido:", body);

    if (body.type === "payment") {

      const paymentId = body.data?.id;

      if (!paymentId) {
        console.error("Payment ID ausente");
        return res.status(200).send("OK");
      }

      // 🔥 buscar pagamento no MP
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
          }
        }
      );

      const payment = await response.json();

      console.log("Pagamento:", payment.id, payment.status);

      if (payment.status === "approved") {

        const bookingId = payment.external_reference;

        if (!bookingId) {
          console.error("Sem bookingId");
          return res.status(200).send("OK");
        }

        // 🔥 atualizar booking
        await fetch(
          "https://beautyglow-br.base44.app/functions/adminAction",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "api_key": process.env.BASE44_API_KEY
            },
            body: JSON.stringify({
              action: "update",
              target_type: "booking",
              target_id: bookingId,
              data: {
                status: "confirmed",
                payment_status: "paid",
                mp_payment_id: payment.id
              }
            })
          }
        );

        console.log("Booking atualizado:", bookingId);
      }
    }

    return res.status(200).send("OK");

  } catch (error) {
    console.error("Erro no webhook:", error);
    return res.status(200).send("Erro tratado");
  }
}
