const mongoose = require("mongoose");

const liveLocationSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    name: String,
    businessName: String,
    profilePhoto: String,
    avatarEmoji: {
      type: String,
      default: "👤",
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },

    city: {
      type: String,
      index: true,
      default: "",
    },

    accuracy: Number,

    isOnline: {
      type: Boolean,
      default: true,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

liveLocationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("LiveLocation", liveLocationSchema);