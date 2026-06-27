const express = require("express");

const {
  registerUser,
  loginUser,
  googleAuth,
  appleAuth,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.post("/google", googleAuth);
router.post("/apple", appleAuth);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post("/apple/callback", (req, res) => {
  res.send("Apple callback received");
});

router.get("/apple/callback", (req, res) => {
  res.send("Apple callback received");
});

module.exports = router;