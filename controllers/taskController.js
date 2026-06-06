const Task = require("../models/Task");

const allowedFields = [
  "localId",
  "title",
  "description",
  "dueDate",
  "dueHour",
  "dueMinute",
  "priority",
  "category",
  "tags",
  "reminders",
  "completed",
  "repeatType",
  "snoozedUntil",
  "activityLogs",
  "subtasks",
];

const normalizeTaskPayload = (payload = {}) => {
  const normalized = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      normalized[field] = payload[field];
    }
  }

  normalized.localId = (normalized.localId || payload.id || payload._id || "").toString();

  if (!normalized.localId) {
    throw new Error("Task localId is required");
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "title")) {
    normalized.title = (normalized.title || "").toString().trim();
  }

  if (!normalized.title && !payload._allowPartial) {
    throw new Error("Task title is required");
  }

  normalized.tags = Array.isArray(normalized.tags) ? normalized.tags.map(String) : [];
  normalized.reminders = Array.isArray(normalized.reminders)
    ? normalized.reminders.map(String)
    : [];
  normalized.activityLogs = Array.isArray(normalized.activityLogs)
    ? normalized.activityLogs.map(String)
    : [];
  normalized.subtasks = Array.isArray(normalized.subtasks)
    ? normalized.subtasks.map((subtask) => ({
        title: (subtask?.title || "").toString(),
        completed: subtask?.completed === true,
      }))
    : [];
  normalized.completed = normalized.completed === true;
  normalized.dueHour = Number.isFinite(Number(normalized.dueHour))
    ? Number(normalized.dueHour)
    : 0;
  normalized.dueMinute = Number.isFinite(Number(normalized.dueMinute))
    ? Number(normalized.dueMinute)
    : 0;
  normalized.lastSyncedAt = new Date();

  return normalized;
};

const taskLookup = (id, userId) => ({
  userId,
  $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined }, { localId: id }].filter(
    (condition) => condition._id !== undefined || condition.localId
  ),
});

const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      userId: req.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Tasks fetched successfully",
      tasks,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const createTask = async (req, res) => {
  try {
    const payload = normalizeTaskPayload(req.body);
    const task = await Task.findOneAndUpdate(
      {
        userId: req.userId,
        localId: payload.localId,
      },
      {
        ...payload,
        userId: req.userId,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Unable to create task",
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const payload = normalizeTaskPayload({
      ...req.body,
      localId: req.body.localId || req.params.id,
      _allowPartial: false,
    });

    const task = await Task.findOneAndUpdate(
      taskLookup(req.params.id, req.userId),
      {
        ...payload,
        userId: req.userId,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found for this user",
      });
    }

    res.status(200).json({
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Unable to update task",
    });
  }
};

const completeTask = async (req, res) => {
  try {
    const completed =
      Object.prototype.hasOwnProperty.call(req.body, "completed")
        ? req.body.completed === true
        : true;

    const task = await Task.findOneAndUpdate(
      taskLookup(req.params.id, req.userId),
      {
        completed,
        lastSyncedAt: new Date(),
        ...(Array.isArray(req.body.activityLogs)
          ? { activityLogs: req.body.activityLogs.map(String) }
          : {}),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found for this user",
      });
    }

    res.status(200).json({
      message: "Task completion updated successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Unable to update task completion",
    });
  }
};

const updateSubtask = async (req, res) => {
  try {
    const subtaskIndex = Number(req.params.subtaskIndex);

    if (!Number.isInteger(subtaskIndex) || subtaskIndex < 0) {
      return res.status(400).json({
        message: "Subtask index must be a non-negative number",
      });
    }

    const task = await Task.findOne(taskLookup(req.params.id, req.userId));

    if (!task) {
      return res.status(404).json({
        message: "Task not found for this user",
      });
    }

    if (!task.subtasks[subtaskIndex]) {
      return res.status(404).json({
        message: "Subtask not found",
      });
    }

    task.subtasks[subtaskIndex].completed = req.body.completed === true;

    if (req.body.title !== undefined) {
      task.subtasks[subtaskIndex].title = req.body.title.toString();
    }

    if (Array.isArray(req.body.activityLogs)) {
      task.activityLogs = req.body.activityLogs.map(String);
    }

    task.lastSyncedAt = new Date();
    await task.save();

    res.status(200).json({
      message: "Subtask updated successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Unable to update subtask",
    });
  }
};

const snoozeTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      taskLookup(req.params.id, req.userId),
      {
        snoozedUntil: req.body.snoozedUntil || null,
        lastSyncedAt: new Date(),
        ...(Array.isArray(req.body.activityLogs)
          ? { activityLogs: req.body.activityLogs.map(String) }
          : {}),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found for this user",
      });
    }

    res.status(200).json({
      message: "Task snoozed successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Unable to snooze task",
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete(taskLookup(req.params.id, req.userId));

    if (!task) {
      return res.status(404).json({
        message: "Task not found for this user",
      });
    }

    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Unable to delete task",
    });
  }
};

const syncTasks = async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({
        message: "Tasks must be an array",
      });
    }

    const savedTasks = [];

    for (const task of tasks) {
      const payload = normalizeTaskPayload(task);
      const savedTask = await Task.findOneAndUpdate(
        {
          userId: req.userId,
          localId: payload.localId,
        },
        {
          ...payload,
          userId: req.userId,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      savedTasks.push(savedTask);
    }

    res.status(200).json({
      message: "Tasks synced successfully",
      tasks: savedTasks,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Unable to sync tasks",
    });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  syncTasks,
  completeTask,
  updateSubtask,
  snoozeTask,
};
