const axios = require("axios");

function getBaseUrl() {
  return process.env.PHONEPE_ENV === "PRODUCTION"
    ? "https://api.phonepe.com/apis/pg"
    : "https://api-preprod.phonepe.com/apis/pg-sandbox";
}

async function createPaymentOrder({
  merchantOrderId,
  amount,
  redirectUrl,
}) {
  const response = await axios.post(
    `${getBaseUrl()}/checkout/v2/pay`,
    {
      merchantOrderId,
      amount,
      expireAfter: 1200,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "My_Biz Event Ticket",
        merchantUrls: {
          redirectUrl,
        },
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        client_id: process.env.PHONEPE_CLIENT_ID,
        client_secret: process.env.PHONEPE_CLIENT_SECRET,
        client_version: process.env.PHONEPE_CLIENT_VERSION,
      },
    }
  );

  return response.data;
}

module.exports = {
  createPaymentOrder,
};