export default async function handler(req, res) {
  try {
    // 🔹 Validação inicial
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

    // 🔥 1. Extrair paymentId corretamente
    let paymentId = null;

// 🔥 formato novo (correto)
if (body.data?.id && body.type === "payment") {
  paymentId = body.data.id;
}

// 🔥 formato antigo
else if (body.topic === "payment" && body.resource) {
  paymentId = body.resource.split("/").pop();
}

// 🚫 IGNORA outros eventos (merchant_order, etc)
if (!paymentId) {
  console.log("❌ Evento ignorado (não é payment):", body);
  return res.status(200).end();
}

    if (!paymentId) {
      console.log("❌ Sem paymentId");
      return res.status(200).end();
    }

    console.log("🆔 PAYMENT ID:", paymentId);

    // 🔥 2. Buscar pagamento real no MP
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    // 🚨 VALIDA resposta da API
    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.log("❌ ERRO MP:", errorText);
      return res.status(200).end();
    }

    const payment = await mpResponse.json();

    console.log("💰 STATUS REAL:", payment.status);
    console.log("📦 PAYMENT:", payment);

    // 🔒 Só continua se aprovado
    if (!payment || payment.status !== "approved") {
      console.log("❌ IGNORADO - status:", payment?.status);
      return res.status(200).end();
    }

    // 🔥 3. Pegar bookingId correto
    const bookingId = payment.external_reference;

    if (!bookingId) {
      console.log("❌ Sem external_reference");
      return res.status(200).end();
    }

    console.log("📌 Atualizando booking:", bookingId);

    // 🔥 4. Atualizar Base44
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
            mercadopago_payment_id: String(payment.id),
          },
        }),
      }
    );

    const result = await base44Response.json();

    console.log("📦 RESPOSTA BASE44:", result);

    // 🚨 valida se realmente atualizou
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
