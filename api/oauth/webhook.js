export default async function handler(req, res) {
  try {
    // 🔹 validação inicial
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

    // 🔥 1. extrair paymentId (robusto)
    let paymentId = null;

// 🔥 suporte completo (todos formatos do MP)
const isPaymentEvent =
  body.type === "payment" ||
  body.topic === "payment" ||
  body.action?.includes("payment");

// formato novo
if (isPaymentEvent && body.data?.id) {
  paymentId = body.data.id;
}

// formato antigo (SEU CASO ATUAL)
else if (isPaymentEvent && body.resource) {
  paymentId = body.resource.split("/").pop();
}

// ignora outros eventos
if (!paymentId) {
  console.log("❌ Evento ignorado (não é payment):", body);
  return res.status(200).end();
}

    console.log("🆔 PAYMENT ID:", paymentId);

    // 🔥 2. buscar pagamento no Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.log("❌ ERRO MP:", errorText);
      return res.status(200).end();
    }

    const payment = await mpResponse.json();

    console.log("💰 STATUS REAL:", payment.status);
    console.log("📌 external_reference:", payment.external_reference);

    // 🔒 só continua se aprovado
    if (!payment || payment.status !== "approved") {
      console.log("⏳ IGNORADO - status:", payment?.status);
      return res.status(200).end();
    }

    // 🔥 3. pegar bookingId
    const bookingId = payment.external_reference;

    if (!bookingId) {
      console.log("❌ Sem external_reference");
      return res.status(200).end();
    }

    console.log("📌 Atualizando booking:", bookingId);

    // 🔥 4. evitar update duplicado (idempotência simples)
    const checkResponse = await fetch(
      `https://beautyglow-br.base44.app/api/entities/Booking/${bookingId}`,
      {
        headers: {
          api_key: process.env.BASE44_API_KEY,
        },
      }
    );

    const currentBooking = await checkResponse.json();

    if (currentBooking?.status === "confirmed") {
      console.log("⚠️ Booking já confirmado, ignorando duplicação");
      return res.status(200).end();
    }

    // 🔥 5. atualizar booking
    const base44Response = await fetch(
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

    const result = await base44Response.json();

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
