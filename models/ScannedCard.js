const mongoose = require("mongoose");

const scannedCardSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    jobTitle: {
      type: String,
      trim: true,
      default: "",
    },

    company: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    website: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    rawText: {
      type: String,
      default: "",
    },

    cardImageUrl: {
      type: String,
      default: "",
    },

    localImagePath: {
      type: String,
      default: "",
    },

    source: {
      type: String,
      default: "business_card_ocr",
    },

    savedToNetwork: {
      type: Boolean,
      default: true,
    },
    
    linkedin: {
  type: String,
  trim: true,
  default: "",
},

instagram: {
  type: String,
  trim: true,
  default: "",
},

facebook: {
  type: String,
  trim: true,
  default: "",
},

whatsapp: {
  type: String,
  trim: true,
  default: "",
},
  },
  { timestamps: true }
);

scannedCardSchema.index({ userEmail: 1 });
scannedCardSchema.index({ userEmail: 1, email: 1 });
scannedCardSchema.index({ userEmail: 1, phone: 1 });

module.exports = mongoose.model("ScannedCard", scannedCardSchema);