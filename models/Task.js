const mongoose = require("mongoose");

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    localId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    dueDate: { type: String, default: null },
    dueHour: { type: Number, default: 0 },
    dueMinute: { type: Number, default: 0 },
    priority: { type: String, default: "Medium" },
    category: { type: String, default: "Meetings" },
    tags: { type: [String], default: [] },
    reminders: { type: [String], default: [] },
    completed: { type: Boolean, default: false },
    repeatType: { type: String, default: "None" },
    snoozedUntil: { type: String, default: null },
    activityLogs: { type: [String], default: [] },
    subtasks: { type: [subtaskSchema], default: [] },
    lastSyncedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ userId: 1, localId: 1 }, { unique: true });

module.exports = mongoose.model("Task", taskSchema);
