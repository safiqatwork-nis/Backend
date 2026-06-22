const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },

    connectionName: { type: String, required: true },
    connectionPhone: { type: String, default: "" },
    connectionEmail: { type: String, default: "" },
    interactionKey: { type: String, default: "" },

    businessName: { type: String, default: "" },
    businessCategory: { type: String, default: "" },
    businessLogo: { type: String, default: "" },
    location: { type: String, default: "" },
    googleMapLocation: { type: String, default: "" },

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
    relationshipStrength: { type: Number, default: 20 },

    source: { type: String, default: "network" },
    contactType: { type: String, default: "app_user" },
    jobTitle: { type: String, default: "" },
    website: { type: String, default: "" },
    rawText: { type: String, default: "" },
    cardImageUrl: { type: String, default: "" },
    localImagePath: { type: String, default: "" },
    scannedCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScannedCard",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Connection", connectionSchema);
