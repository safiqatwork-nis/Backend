const axios = require("axios");

function getBaseUrl() {
  return process.env.PHONEPE_ENV === "PRODUCTION"
    ? "https://api.phonepe.com/apis"
    : "https://api-preprod.phonepe.com/apis/pg-sandbox";
}

async function getAccessToken() {
  const url =
    process.env.PHONEPE_ENV === "PRODUCTION"
      ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";

  const params = new URLSearchParams();
  params.append("client_id", process.env.PHONEPE_CLIENT_ID);
  params.append("client_version", process.env.PHONEPE_CLIENT_VERSION || "1");
  params.append("client_secret", process.env.PHONEPE_CLIENT_SECRET);
  params.append("grant_type", "client_credentials");

  const response = await axios.post(url, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data.access_token;
}

async function createPaymentOrder({
  merchantOrderId,
  amount,
  redirectUrl,
}) {
  const accessToken = await getAccessToken();

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
        Authorization: `O-Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
}

module.exports = {
  createPaymentOrder,
};