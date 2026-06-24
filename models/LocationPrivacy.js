const mongoose = require("mongoose");

const locationPrivacySchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    ghostMode: {
      type: Boolean,
      default: false,
    },

    visibility: {
      type: String,
      enum: ["friends_only", "trusted_connections"],
      default: "friends_only",
    },

    locationPrecision: {
      type: String,
      enum: ["precise", "approximate"],
      default: "precise",
    },

    shareLiveLocation: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LocationPrivacy", locationPrivacySchema);