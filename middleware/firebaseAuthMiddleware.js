const { verifyFirebaseIdToken } = require("../config/firebaseAdmin");

const MAX_AUTH_AGE_SECONDS = 10 * 60;
const EMAIL_LINK_PROVIDERS = new Set(["password", "emailLink"]);

const requireFirebaseEmailVerification = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Firebase email verification is required",
      });
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    const decodedToken = await verifyFirebaseIdToken(idToken);
    const tokenEmail = decodedToken.email?.trim().toLowerCase();
    const requestEmail = req.body.email?.trim().toLowerCase();
    const signInProvider = decodedToken.firebase?.sign_in_provider;
    const authAge = Math.floor(Date.now() / 1000) - decodedToken.auth_time;

    if (
      !tokenEmail ||
      decodedToken.email_verified !== true ||
      tokenEmail !== requestEmail ||
      !EMAIL_LINK_PROVIDERS.has(signInProvider) ||
      !Number.isFinite(authAge) ||
      authAge < 0 ||
      authAge > MAX_AUTH_AGE_SECONDS
    ) {
      return res.status(401).json({
        message: "Firebase email verification is invalid or expired",
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
      message: "Firebase email verification is invalid or expired",
    });
  }
};

module.exports = { requireFirebaseEmailVerification };
