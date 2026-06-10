const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    createdByEmail: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    eventType: {
      type: String,
      enum: ["startup", "networking", "pitch", "workshop", "seminar", "business", "other"],
      default: "business",
    },

    district: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      default: "",
    },

    venue: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      default: "",
    },

    startDateTime: {
      type: Date,
      required: true,
    },

    endDateTime: {
      type: Date,
      required: true,
    },

    capacity: {
      type: Number,
      required: true,
      default: 0,
    },

    ticketPrice: {
      type: Number,
      required: true,
      default: 0,
    },

    agenda: {
      type: String,
      default: "",
    },

    imageUrl: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["draft", "published", "cancelled", "completed"],
      default: "published",
    },

    liveUpdateMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);