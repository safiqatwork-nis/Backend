const express = require("express");

const {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  syncTasks,
  completeTask,
  updateSubtask,
  snoozeTask,
} = require("../controllers/taskController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getTasks);
router.post("/", protect, createTask);
router.post("/sync", protect, syncTasks);
router.patch("/:id/complete", protect, completeTask);
router.patch("/:id/subtasks/:subtaskIndex", protect, updateSubtask);
router.patch("/:id/snooze", protect, snoozeTask);
router.put("/:id", protect, updateTask);
router.delete("/:id", protect, deleteTask);

module.exports = router;
