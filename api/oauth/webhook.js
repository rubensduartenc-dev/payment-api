export default async function handler(req, res) {
  try {

    // ✅ 1. Permitir acesso via navegador (GET)
    if (req.method !== "POST") {
      return res.status(200).send("Webhook ativo");
    }

    // ✅ 2. Garantir parsing seguro do body
    let body = req.body;

    if (!body) {
      console.log("⚠️ Webhook sem body");
      return res.status(200).send("OK");
    }

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.log("❌ Erro ao parsear JSON");
        return res.status(200).send("OK");
      }
    }

    console.log("📩 Webhook recebido:", body);

    // ✅ 3. Validar tipo do evento
    if (!body.type) {
      console.log("⚠️ Body sem type");
      return res.status(200).send("OK");
    }

    if (body.type !== "payment") {
      console.log("ℹ️ Evento ignorado:", body.type);
      return res.status(200).send("Ignorado");
    }

    const paymentId = body.data?.id;

    if (!paymentId) {
      console.log("❌ Payment ID não encontrado");
      return res.status(200).send("OK");
    }

    console.log("💳 Payment ID:", paymentId);

    // ✅ 4. Buscar pagamento no Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      }
    );

    const payment = await mpResponse.json();

    console.log("📊 Status pagamento:", payment.status);

    // ✅ 5. Só processa se aprovado
    if (payment.status !== "approved") {
      console.log("⏳ Pagamento ainda não aprovado");
      return res.status(200).send("OK");
    }

    const bookingId = payment.external_reference;

    if (!bookingId) {
      console.log("❌ external_reference vazio");
      return res.status(200).send("OK");
    }

    console.log("📌 Booking ID:", bookingId);

    // ✅ 6. Atualizar booking no Base44
    const updateResponse = await fetch(
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

    const updateResult = await updateResponse.json();

    console.log("✅ Booking atualizado:", updateResult);

    return res.status(200).send("OK");

  } catch (error) {
    console.error("🔥 Erro no webhook:", error);

    // ⚠️ IMPORTANTE: nunca retornar 500 pro Mercado Pago
    return res.status(200).send("Erro tratado");
  }
}
