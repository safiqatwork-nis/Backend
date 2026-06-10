const mongoose = require("mongoose");

const attendeeSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String, default: "" },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined", "tentative"],
    default: "pending",
  },
});

const actionItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const eventSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },

    title: { type: String, required: true },
    description: { type: String, default: "" },
    eventType: {
      type: String,
      enum: ["startup", "networking", "pitch", "workshop", "private", "public"],
      default: "networking",
    },

    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },

    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, required: true },

    venue: { type: String, default: "" },
    location: { type: String, default: "" },
    capacity: { type: Number, default: 0 },
    agenda: { type: String, default: "" },

    googleEventId: { type: String, default: "" },
    calendarId: { type: String, default: "primary" },

    rsvpStatus: {
      type: String,
      enum: ["pending", "accepted", "declined", "tentative"],
      default: "pending",
    },

    attendees: [attendeeSchema],

    notes: { type: String, default: "" },
    actionItems: [actionItemSchema],

    checkInCode: { type: String, default: "" },
    checkedInAttendees: [{ email: String, checkedInAt: Date }],

    isCancelled: { type: Boolean, default: false },
    liveUpdateMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);