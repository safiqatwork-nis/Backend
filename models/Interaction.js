const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    connectionPhone: { type: String, required: true },

    type: {
      type: String,
      enum: ["Message", "Meeting", "Event", "Call", "Note"],
      default: "Note",
    },

    title: { type: String, required: true },
    description: { type: String, default: "" },
    interactionDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Interaction", interactionSchema);