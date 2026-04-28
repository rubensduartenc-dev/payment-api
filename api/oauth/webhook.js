export default async function handler(req, res) {
  try {
    // 🔹 Mercado Pago envia GET para validar webhook
    if (req.method === "GET") {
      return res.status(200).send("OK");
    }

    // 🔹 Só aceitamos POST real
    if (req.method !== "POST") {
      return res.status(405).end();
    }

    const body = req.body;

    console.log("📩 Webhook recebido:", JSON.stringify(body));

    // 🔹 Validação básica
    if (!body) {
      console.log("❌ Body vazio");
      return res.status(200).end();
    }

    // 🔹 Mercado Pago pode mandar em formatos diferentes
    const paymentId =
      body.data?.id ||        // formato padrão
      body.resource ||        // às vezes vem como string
      body.id;                // fallback

    if (!paymentId) {
      console.log("❌ Sem paymentId");
      return res.status(200).end();
    }

    console.log("💳 Payment ID:", paymentId);

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

    console.log("💰 Pagamento completo:", payment);

    // 🔹 Só continua se aprovado
    if (payment.status !== "approved") {
      console.log("⚠️ Pagamento não aprovado:", payment.status);
      return res.status(200).end();
    }

    // 🔥 ESSENCIAL
    const bookingId = payment.external_reference;

    if (!bookingId) {
      console.log("❌ Sem bookingId no external_reference");
      return res.status(200).end();
    }

    console.log("📌 Atualizando booking:", bookingId);

    // 🔥 ATUALIZA NO BASE44 (FORMATO CORRETO)
    const base44Response = await fetch(
      "https://beautyglow-br.base44.app/functions/adminAction",
      {
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
            mercadopago_payment_id: String(payment.id),
          },
        }),
      }
    );

    const base44Result = await base44Response.json();

    console.log("📦 RESPOSTA BASE44:", base44Result);

    // 🔹 Verificação real
    if (!base44Result || base44Result.error) {
      console.log("❌ ERRO AO ATUALIZAR BOOKING");
    } else {
      console.log("✅ Booking atualizado com sucesso");
    }

    return res.status(200).end();

  } catch (error) {
    console.error("🔥 ERRO NO WEBHOOK:");
    console.error(error);
    return res.status(500).end();
  }
}
