export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).send("OK");
    }

    if (req.method !== "POST") {
      return res.status(405).end();
    }

    const body = req.body;

    console.log("🔔 Webhook recebido:", JSON.stringify(body));

    if (!body) {
      console.log("❌ Body vazio");
      return res.status(200).end();
    }

    // 🔥 1. identificar se é evento de pagamento
    const isPaymentEvent =
      body.type === "payment" ||
      body.topic === "payment" ||
      body.action?.includes("payment");

    let paymentId = null;

    if (isPaymentEvent && body.data?.id) {
      paymentId = body.data.id;
    } else if (isPaymentEvent && body.resource) {
      paymentId = body.resource.split("/").pop();
    }

    if (!paymentId) {
      console.log("❌ Evento ignorado (não é payment):", body);
      return res.status(200).end();
    }

    console.log("🆔 PAYMENT ID:", paymentId);

    // 🔥 2. PRIMEIRO buscar payment com token global (para pegar external_reference)
    const initialResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    if (!initialResponse.ok) {
      const errorText = await initialResponse.text();
      console.log("❌ ERRO MP (initial):", errorText);
      return res.status(200).end();
    }

    const initialPayment = await initialResponse.json();

    const bookingId = initialPayment.external_reference;

    console.log("📌 external_reference:", bookingId);

    if (!bookingId) {
      console.log("❌ Sem external_reference");
      return res.status(200).end();
    }

    // 🔥 3. buscar booking para pegar token do profissional
    const bookingResponse = await fetch(
      `https://beautyglow-br.base44.app/api/entities/Booking/${bookingId}`,
      {
        headers: {
          api_key: process.env.BASE44_API_KEY,
        },
      }
    );

    const booking = await bookingResponse.json();

    const accessToken = booking?.mp_access_token;

    if (!accessToken) {
      console.log("❌ Booking sem mp_access_token");
      return res.status(200).end();
    }

    console.log("🔑 Usando token do profissional");

    // 🔥 4. buscar payment REAL com token correto
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.log("❌ ERRO MP (final):", errorText);
      return res.status(200).end();
    }

    const payment = await mpResponse.json();

    console.log("💰 STATUS REAL:", payment.status);

    // 🔒 só continua se aprovado
    if (payment.status !== "approved") {
      console.log("⏳ IGNORADO - status:", payment.status);
      return res.status(200).end();
    }

    console.log("📌 Atualizando booking:", bookingId);

    // 🔥 5. evitar duplicação
    if (booking.status === "confirmed") {
      console.log("⚠️ Já confirmado, ignorando");
      return res.status(200).end();
    }

    // 🔥 6. atualizar booking
    const updateResponse = await fetch(
      `https://beautyglow-br.base44.app/api/entities/Booking/${bookingId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          api_key: process.env.BASE44_API_KEY,
        },
        body: JSON.stringify({
          status: "confirmed",
          mercadopago_payment_id: String(payment.id),
        }),
      }
    );

    const result = await updateResponse.json();

    console.log("📦 RESPOSTA BASE44:", result);

    if (!result || result.error) {
      console.log("❌ ERRO AO ATUALIZAR BOOKING");
    } else {
      console.log("✅ Booking atualizado com sucesso");
    }

    return res.status(200).end();
  } catch (error) {
    console.error("🔥 ERRO NO WEBHOOK:", error);
    return res.status(500).end();
  }
}
