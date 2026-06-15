const mongoose = require("mongoose");

const connectionRequestSchema = new mongoose.Schema(
  {
    fromEmail: { type: String, required: true },
    toEmail: { type: String, required: true },

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
  "ConnectionRequest",
  connectionRequestSchema
);