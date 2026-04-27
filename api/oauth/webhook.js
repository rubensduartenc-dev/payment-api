export default async function handler(req, res) {
  try {
    const body = req.body;

    if (body.type === "payment") {
      const paymentId = body.data.id;

      // 🔥 Buscar dados do pagamento
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
          }
        }
      );

      const payment = await response.json();

      console.log("Pagamento recebido:", payment.id);

      // ✅ Verifica se foi aprovado
      if (payment.status === "approved") {

  const bookingId = payment.external_reference;

  console.log("Pagamento aprovado para booking:", bookingId);

  // 🔥 1. BUSCAR BOOKING
  const bookingResponse = await fetch(
    "https://beautyglow-br.base44.app/functions/adminAction",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_key": process.env.BASE44_API_KEY
      },
      body: JSON.stringify({
        action: "get",
        target_type: "booking",
        target_id: bookingId
      })
    }
  );

  const { result: booking } = await bookingResponse.json();

  if (!booking) {
    console.error("Booking não encontrado");
    return;
  }

  // 🔥 2. BUSCAR PROFISSIONAL
  const professionalResponse = await fetch(
    "https://beautyglow-br.base44.app/functions/adminAction",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_key": process.env.BASE44_API_KEY
      },
      body: JSON.stringify({
        action: "get",
        target_type: "professional",
        target_id: booking.professional_id
      })
    }
  );

  const { result: professional } = await professionalResponse.json();

  if (!professional || !professional.mp_access_token) {
    console.error("Token do profissional não encontrado");
    return;
  }

  // 🔥 3. AGORA SIM você pode confiar no pagamento
  console.log("Profissional encontrado:", professional.id);

  // 🔥 4. ATUALIZAR BOOKING COMO PAGO
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
          payment_status: "approved"
        }
      })
    }
  );
}
        // 🚀 ATUALIZAR NO BASE44
        await fetch("https://beautyglow-br.base44.app/functions/adminAction", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api_key": process.env.BASE44_API_KEY
          },
          body: JSON.stringify({
            action: "update_booking_payment",
            target_type: "booking",
            target_id: bookingId,
            data: {
              status: "confirmed",
              payment_status: "paid",
              mp_payment_id: payment.id
            }
          })
        });

        console.log("Booking confirmado com sucesso!");
      }
    }

    return res.status(200).send("OK");

  } catch (error) {
    console.error("Erro no webhook:", error);
    return res.status(500).send("Erro");
  }
}
