const mongoose = require("mongoose");

const locationHistorySchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
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

    city: String,
    accuracy: Number,
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

locationHistorySchema.index({ location: "2dsphere" });
locationHistorySchema.index({ userEmail: 1, recordedAt: -1 });

module.exports = mongoose.model("LocationHistory", locationHistorySchema);