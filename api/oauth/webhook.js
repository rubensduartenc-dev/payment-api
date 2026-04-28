export const config = {
  api: {
    bodyParser: true,
  },
};
export default async function handler(req, res) {
  try {
    // 🔹 Mercado Pago testa com GET
    if (req.method === "GET") {
      return res.status(200).send("OK");
    }

    if (req.method !== "POST") {
      return res.status(405).end();
    }

   const body = typeof req.body === "string"
  ? JSON.parse(req.body)
  : req.body;

    console.log("Webhook recebido:", JSON.stringify(body));

    // 🔥 Validação correta do payload
    if (!body || !body.data || !body.data.id) {
      console.log("Webhook inválido");
      return res.status(200).end();
    }

    console.log("Evento recebido:", body.action);

    const paymentId = body.data.id;

    // 🔥 Buscar pagamento no Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = await mpResponse.json();

    console.log("Pagamento completo:", payment);

    // 🔥 Só processa se aprovado
    if (payment.status !== "approved") {
      console.log("Pagamento não aprovado:", payment.status);
      return res.status(200).end();
    }

    // 🔥 Pega o booking vinculado
    const bookingId = payment.external_reference;

    if (!bookingId) {
      console.log("Sem bookingId");
      return res.status(200).end();
    }

    console.log("Atualizando booking:", bookingId);

    // 🔥 Atualiza no Base44
    await fetch("https://beautyglow-br.base44.app/functions/adminAction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_key": process.env.BASE44_API_KEY,
      },
      body: JSON.stringify({
        action: "update",
        target_type: "booking",
        target_id: bookingId,
        data: {
          status: "confirmed",
          payment_status: "approved",
        },
      }),
    });

    console.log("Booking atualizado com sucesso");

    return res.status(200).end();

  } catch (error) {
    console.error("Erro no webhook:", error);
    return res.status(500).end();
  }
}
