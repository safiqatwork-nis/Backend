const mongoose = require("mongoose");

const calendarEventSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    taskId: {
      type: String,
      default: "",
    },

    googleEventId: {
      type: String,
      default: "",
    },

    calendarId: {
      type: String,
      default: "primary",
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "General",
    },

    priority: {
      type: String,
      default: "Medium",
    },

    startDateTime: {
      type: Date,
      required: true,
    },

    endDateTime: {
      type: Date,
      required: true,
    },

    attendees: {
      type: [String],
      default: [],
    },

    videoLink: {
      type: String,
      default: "",
    },

    recurrenceRule: {
      type: String,
      default: "",
    },

    syncStatus: {
      type: String,
      enum: ["local", "google_synced", "failed"],
      default: "local",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CalendarEvent", calendarEventSchema);