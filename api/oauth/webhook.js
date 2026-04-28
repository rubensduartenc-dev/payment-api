export default async function handler(req, res) {
  try {
    // Mercado Pago pode enviar GET (validação)
    if (req.method === "GET") {
      return res.status(200).send("OK");
    }

    if (req.method !== "POST") {
      return res.status(405).end();
    }

    const body = req.body;

    console.log("🔔 Webhook recebido:", JSON.stringify(body));

    // 🔒 valida estrutura básica
    if (!body) {
      console.log("❌ Body vazio");
      return res.status(200).end();
    }

    // 🔥 suporta dois formatos do Mercado Pago
    const paymentId =
      body.data?.id || // formato novo
      body.resource?.split("/").pop(); // formato antigo

    if (!paymentId) {
      console.log("❌ Sem paymentId");
      return res.status(200).end();
    }

    console.log("🔎 Buscando pagamento:", paymentId);

    // 🔥 buscar pagamento completo
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = await mpResponse.json();

    console.log("💰 Pagamento completo:", payment);

    // 🔒 BLOQUEIO CRÍTICO
    if (!payment || payment.status !== "approved") {
      console.log("❌ IGNORADO - status:", payment?.status);
      return res.status(200).end();
    }

    // 🔥 pegar referência do booking
    const bookingId = payment.external_reference;

    if (!bookingId) {
      console.log("❌ Sem external_reference");
      return res.status(200).end();
    }

    console.log("📌 Atualizando booking:", bookingId);

    // 🔥 chamada correta para Base44
    const base44Response = await fetch(
      "https://beautyglow-br.base44.app/functions/adminAction",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_key: process.env.BASE44_API_KEY,
        },
        body: JSON.stringify({
          action: "update_booking_payment",
          target_type: "booking",
          target_id: bookingId,
          data: {
            status: "confirmed",
            mercadopago_payment_id: payment.id,
          },
        }),
      }
    );

    const result = await base44Response.json();

    console.log("✅ RESPOSTA BASE44:", result);

    console.log("✅ Booking atualizado com sucesso");

    return res.status(200).end();
  } catch (error) {
    console.error("🔥 ERRO NO WEBHOOK:", error);
    return res.status(500).end();
  }
}
