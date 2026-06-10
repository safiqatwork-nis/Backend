const mongoose = require("mongoose");

const calendarWatchSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    calendarId: {
      type: String,
      default: "primary",
    },
    channelId: {
      type: String,
      required: true,
      unique: true,
    },
    resourceId: {
      type: String,
      default: "",
    },
    expiration: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CalendarWatch", calendarWatchSchema);