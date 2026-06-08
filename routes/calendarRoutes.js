const express = require("express");
const CalendarEvent = require("../models/CalendarEvent");

const router = express.Router();

router.post("/create", async (req, res) => {
  try {
    const {
      userEmail,
      taskId,
      title,
      description,
      location,
      category,
      priority,
      startDateTime,
      endDateTime,
      attendees,
      videoLink,
      recurrenceRule,
    } = req.body;

    if (!userEmail || !title || !startDateTime || !endDateTime) {
      return res.status(400).json({
        success: false,
        message: "userEmail, title, startDateTime and endDateTime are required",
      });
    }

    const conflict = await CalendarEvent.findOne({
      userEmail: userEmail.toLowerCase(),
      startDateTime: { $lt: new Date(endDateTime) },
      endDateTime: { $gt: new Date(startDateTime) },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        conflict: true,
        message: `Conflict with ${conflict.title}`,
        conflictEvent: conflict,
      });
    }

    const event = await CalendarEvent.create({
      userEmail,
      taskId: taskId || "",
      title,
      description: description || "",
      location: location || "",
      category: category || "General",
      priority: priority || "Medium",
      startDateTime,
      endDateTime,
      attendees: attendees || [],
      videoLink: videoLink || "",
      recurrenceRule: recurrenceRule || "",
      syncStatus: "local",
    });

    return res.status(201).json({
      success: true,
      message: "Calendar event created",
      event,
    });
  } catch (error) {
    console.error("Create calendar event error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.get("/events/:userEmail", async (req, res) => {
  try {
    const events = await CalendarEvent.find({
      userEmail: req.params.userEmail.toLowerCase(),
    }).sort({ startDateTime: 1 });

    return res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("Get calendar events error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;