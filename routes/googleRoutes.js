const express = require("express");
const { google } = require("googleapis");
const GoogleToken = require("../models/GoogleToken");

const router = express.Router();

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

router.get("/auth", (req, res) => {
  const oauth2Client = createOAuthClient();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });

  res.redirect(url);
});

router.get("/callback", async (req, res) => {
  try {
    const oauth2Client = createOAuthClient();
    const { code } = req.query;

    if (!code) {
      return res.status(400).send("Authorization code missing");
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email;

    await GoogleToken.findOneAndUpdate(
      { userEmail: userEmail.toLowerCase() },
      {
        userEmail: userEmail.toLowerCase(),
        accessToken: tokens.access_token || "",
        refreshToken: tokens.refresh_token || "",
        scope: tokens.scope || "",
        tokenType: tokens.token_type || "",
        expiryDate: tokens.expiry_date || 0,
      },
      { upsert: true, returnDocument: "after" }
    );

    res.send(`
      <h2>Google Calendar connected successfully</h2>
      <p>Email: ${userEmail}</p>
      <p>You can close this page and return to My_Biz app.</p>
    `);
  } catch (error) {
    console.error("Google callback error:", error);
    res.status(500).send("Google authentication failed");
  }
});

router.get("/status/:email", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();

    const token = await GoogleToken.findOne({
      userEmail: email,
    });

    return res.json({
      success: true,
      connected: !!token,
      email,
    });
  } catch (error) {
    console.error("Google status error:", error);
    return res.status(500).json({
      success: false,
      connected: false,
      message: "Server error",
    });
  }
});

module.exports = router;