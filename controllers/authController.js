const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const tls = require("tls");
const { OAuth2Client } = require("google-auth-library");
const appleSignin = require("apple-signin-auth");

const googleClient = new OAuth2Client(process.env.GOOGLE_AUTH_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+[1-9]\d{7,14}$/;
const normalizePhone = (phone) => String(phone || "").replace(/[\s()-]/g, "");

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

const readSmtpResponse = (socket) =>
  new Promise((resolve, reject) => {
    let response = "";

    const onData = (data) => {
      response += data.toString();
      const lines = response.split("\r\n").filter(Boolean);
      const lastLine = lines[lines.length - 1] || "";

      if (/^\d{3} /.test(lastLine)) {
        cleanup();
        resolve({ code: Number(lastLine.slice(0, 3)), response });
      }
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });

const sendSmtpCommand = async (socket, command, validCodes) => {
  const responsePromise = readSmtpResponse(socket);
  socket.write(`${command}\r\n`);
  const result = await responsePromise;

  if (!validCodes.includes(result.code)) {
    throw new Error(`Email server rejected the request (${result.code})`);
  }
};

const sendChangePasswordOtpEmail = async (email, otp) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS?.replace(/\s/g, "");

  if (!emailUser || !emailPass) {
    throw new Error("Email service is not configured");
  }

  const socket = tls.connect({ host: "smtp.gmail.com", port: 465 });

  try {
    const greeting = await readSmtpResponse(socket);
    if (greeting.code !== 220) throw new Error("Email server is unavailable");

    await sendSmtpCommand(socket, "EHLO mybiz", [250]);
    await sendSmtpCommand(socket, "AUTH LOGIN", [334]);
    await sendSmtpCommand(
      socket,
      Buffer.from(emailUser).toString("base64"),
      [334],
    );
    await sendSmtpCommand(
      socket,
      Buffer.from(emailPass).toString("base64"),
      [235],
    );
    await sendSmtpCommand(socket, `MAIL FROM:<${emailUser}>`, [250]);
    await sendSmtpCommand(socket, `RCPT TO:<${email}>`, [250, 251]);
    await sendSmtpCommand(socket, "DATA", [354]);

    const message = [
      `From: MyBiz <${emailUser}>`,
      `To: ${email}`,
      "Subject: MyBiz change password OTP",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      `Your OTP to change your MyBiz password is ${otp}.`,
      "This OTP expires in 10 minutes.",
      "If you did not request this, you can ignore this email.",
    ].join("\r\n");

    await sendSmtpCommand(socket, `${message}\r\n.`, [250]);
    await sendSmtpCommand(socket, "QUIT", [221]);
  } finally {
    socket.destroy();
  }
};

const sendChangePasswordOtp = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await User.findById(req.user._id);

    if (!user || user.authProvider !== "email") {
      return res.status(400).json({
        message: "Password change is only available for email login accounts",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const [hashedOtp, pendingNewPasswordHash] = await Promise.all([
      bcrypt.hash(otp, 10),
      bcrypt.hash(newPassword, 10),
    ]);

    await sendChangePasswordOtpEmail(user.email, otp);

    user.changePasswordOtp = hashedOtp;
    user.changePasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.pendingNewPasswordHash = pendingNewPasswordHash;
    await user.save();

    res.status(200).json({
      message: "OTP sent to your email",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyChangePasswordOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({ message: "Enter a valid 6-digit OTP" });
    }

    const user = await User.findById(req.user._id);

    if (!user || user.authProvider !== "email") {
      return res.status(400).json({
        message: "Password change is only available for email login accounts",
      });
    }

    if (
      !user.changePasswordOtp ||
      !user.changePasswordOtpExpires ||
      !user.pendingNewPasswordHash
    ) {
      return res.status(400).json({ message: "Request a new OTP first" });
    }

    if (user.changePasswordOtpExpires.getTime() <= Date.now()) {
      user.changePasswordOtp = null;
      user.changePasswordOtpExpires = null;
      user.pendingNewPasswordHash = null;
      await user.save();
      return res.status(400).json({ message: "OTP has expired" });
    }

    const isOtpValid = await bcrypt.compare(String(otp), user.changePasswordOtp);
    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.password = user.pendingNewPasswordHash;
    user.changePasswordOtp = null;
    user.changePasswordOtpExpires = null;
    user.pendingNewPasswordHash = null;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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

const registerUser = async (req, res) => {
  try {
    let { name, email, phone, password } = req.body;

    name = name?.trim();
    email = email?.trim().toLowerCase();
    phone = normalizePhone(phone);

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (name.length < 3) {
      return res.status(400).json({ message: "Name must be at least 3 characters" });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        message: "Enter a valid phone number with country code",
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });

    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "User already exists"
            : "Phone number is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone,
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
    let { email, phone } = req.body;

    email = email?.trim().toLowerCase();
    phone = normalizePhone(phone);

    if (!email || !phone) {
      return res.status(400).json({
        message: "Email and phone number are required",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        message: "Enter a valid phone number with country code",
      });
    }

    const user = await User.findOne({ email, phone });

    if (!user || user.authProvider !== "email") {
      return res.status(404).json({
        message: "Email and registered phone number do not match",
      });
    }

    res.status(200).json({
      message: "Account confirmed. Continue with Firebase phone verification",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    let { email, phone, newPassword } = req.body;

    email = email?.trim().toLowerCase();
    phone = normalizePhone(phone);

    if (!email || !phone || !newPassword) {
      return res.status(400).json({
        message: "Email, phone number and new password are required",
      });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await User.findOne({ email, phone });

    if (!user || user.authProvider !== "email") {
      return res.status(404).json({
        message: "Email and registered phone number do not match",
      });
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
  sendChangePasswordOtp,
  verifyChangePasswordOtp,

};
