const { verifyFirebaseIdToken } = require("../config/firebaseAdmin");

const MAX_AUTH_AGE_SECONDS = 10 * 60;
const normalizePhone = (phone) => String(phone || "").replace(/[\s()-]/g, "");

const requireFirebasePhoneVerification = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Firebase phone verification is required",
      });
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    const decodedToken = await verifyFirebaseIdToken(idToken);
    const tokenPhone = normalizePhone(decodedToken.phone_number);
    const requestPhone = normalizePhone(req.body.phone);
    const signInProvider = decodedToken.firebase?.sign_in_provider;
    const authAge = Math.floor(Date.now() / 1000) - decodedToken.auth_time;

    if (
      !tokenPhone ||
      tokenPhone !== requestPhone ||
      signInProvider !== "phone" ||
      !Number.isFinite(authAge) ||
      authAge < 0 ||
      authAge > MAX_AUTH_AGE_SECONDS
    ) {
      return res.status(401).json({
        message: "Firebase phone verification is invalid or expired",
      });
    }

    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    if (
      error.message?.startsWith("Firebase token verification is not configured")
    ) {
      return res.status(503).json({ message: error.message });
    }

    return res.status(401).json({
      message: "Firebase phone verification is invalid or expired",
    });
  }
};

module.exports = { requireFirebasePhoneVerification };
