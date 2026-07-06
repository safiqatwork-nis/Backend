const express = require("express");

const {
  registerUser,
  loginUser,
  googleAuth,
  appleAuth,
  forgotPassword,
  resetPassword,
  sendChangePasswordOtp,
  verifyChangePasswordOtp,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const {
  requireFirebasePhoneVerification,
} = require("../middleware/firebaseAuthMiddleware");

const router = express.Router();

router.post("/register", requireFirebasePhoneVerification, registerUser);
router.post("/login", loginUser);

router.post("/google", googleAuth);
router.post("/apple", appleAuth);

router.post("/forgot-password", forgotPassword);
router.post(
  "/reset-password",
  requireFirebasePhoneVerification,
  resetPassword,
);
router.post("/change-password/send-otp", protect, sendChangePasswordOtp);
router.post("/change-password/verify", protect, verifyChangePasswordOtp);

router.post("/apple/callback", (req, res) => {
  res.send("Apple callback received");
});

router.get("/apple/callback", (req, res) => {
  res.send("Apple callback received");
});

module.exports = router;
