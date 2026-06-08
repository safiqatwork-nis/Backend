const mongoose = require("mongoose");

const googleTokenSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    accessToken: String,
    refreshToken: String,
    scope: String,
    tokenType: String,
    expiryDate: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("GoogleToken", googleTokenSchema);