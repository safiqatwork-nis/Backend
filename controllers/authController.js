const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
const appleSignin = require("apple-signin-auth");

const googleClient = new OAuth2Client(process.env.GOOGLE_AUTH_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sendResponse = (res, status, message, user) => {
  res.status(status).json({
    message,
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
    },
  });
};

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  return null;
};

const sendResetOtpEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"MyBiz" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "MyBiz Password Reset OTP",
    html: `
      <h2>Password Reset OTP</h2>
      <p>Your MyBiz password reset OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for 10 minutes.</p>
    `,
  });
};

const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    name = name?.trim();
    email = email?.trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (name.length < 3) {
      return res.status(400).json({ message: "Name must be at least 3 characters" });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      authProvider: "email",
    });

    sendResponse(res, 201, "Registration Successful", user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;

    email = email?.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const user = await User.findOne({ email });

    if (!user || user.authProvider !== "email") {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    sendResponse(res, 200, "Login Successful", user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Google token is required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_AUTH_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const email = payload.email?.toLowerCase();
    const name = payload.name || "Google User";
    const googleId = payload.sub;

    if (!email) {
      return res.status(400).json({ message: "Google email not found" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        authProvider: "google",
      });
    } else {
      user.googleId = user.googleId || googleId;
      await user.save();
    }

    sendResponse(res, 200, "Google authentication successful", user);
  } catch (error) {
    res.status(401).json({ message: "Google authentication failed" });
  }
};

const appleAuth = async (req, res) => {
  try {
    const { identityToken, fullName } = req.body;

    if (!identityToken) {
      return res.status(400).json({ message: "Apple token is required" });
    }

    const appleUser = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    const email = appleUser.email?.toLowerCase();
    const appleId = appleUser.sub;

    if (!email) {
      return res.status(400).json({
        message: "Apple email not found. Please allow email access.",
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: fullName || "Apple User",
        email,
        appleId,
        authProvider: "apple",
      });
    } else {
      user.appleId = user.appleId || appleId;
      await user.save();
    }

    sendResponse(res, 200, "Apple authentication successful", user);
  } catch (error) {
    res.status(401).json({ message: "Apple authentication failed" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;

    email = email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const user = await User.findOne({ email });

    if (!user || user.authProvider !== "email") {
      return res.status(404).json({
        message: "No email-password account found with this email",
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    user.resetOtp = await bcrypt.hash(otp, 10);
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendResetOtpEmail(email, otp);

    res.status(200).json({
      message: "Password reset OTP sent to your email",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;

    email = email?.trim().toLowerCase();

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: "Email, OTP and new password are required",
      });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await User.findOne({ email });

    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ message: "Invalid reset request" });
    }

    if (user.resetOtpExpires < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isOtpValid = await bcrypt.compare(otp, user.resetOtp);

    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = null;
    user.resetOtpExpires = null;
    await user.save();

    res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleAuth,
  appleAuth,
  forgotPassword,
  resetPassword,
};