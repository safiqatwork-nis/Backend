const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    connectionEmail: { type: String, required: true },

    category: {
      type: String,
      enum: ["Investor", "Mentor", "Partner", "Customer", "Vendor", "Peer"],
      default: "Peer",
    },

    tier: {
      type: String,
      enum: ["1st", "2nd", "3rd"],
      default: "1st",
    },

    notes: { type: String, default: "" },

    relationshipStrength: {
      type: Number,
      default: 20,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Connection", connectionSchema);