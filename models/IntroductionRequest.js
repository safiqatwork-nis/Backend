const mongoose = require("mongoose");

const introductionRequestSchema = new mongoose.Schema(
  {
    requesterEmail: { type: String, required: true },
    mutualEmail: { type: String, required: true },
    targetEmail: { type: String, required: true },

    note: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "IntroductionRequest",
  introductionRequestSchema
);