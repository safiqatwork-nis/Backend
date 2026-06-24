const mongoose = require("mongoose");

const proximityAlertSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    targetEmail: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    radiusMeters: {
      type: Number,
      default: 1000,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    lastTriggeredAt: Date,
  },
  { timestamps: true }
);

proximityAlertSchema.index({ userEmail: 1, targetEmail: 1 }, { unique: true });

module.exports = mongoose.model("ProximityAlert", proximityAlertSchema);