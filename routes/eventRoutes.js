const express = require("express");
const crypto = require("crypto");
const Event = require("../models/Event");

const router = express.Router();

router.post("/create", async (req, res) => {
  try {
    const {
      userEmail,
      title,
      description,
      eventType,
      visibility,
      startDateTime,
      endDateTime,
      venue,
      location,
      capacity,
      agenda,
      attendees,
    } = req.body;

    if (!userEmail || !title || !startDateTime || !endDateTime) {
      return res.status(400).json({
        success: false,
        message: "userEmail, title, startDateTime and endDateTime are required",
      });
    }

    const event = await Event.create({
      userEmail,
      title,
      description,
      eventType,
      visibility,
      startDateTime,
      endDateTime,
      venue,
      location,
      capacity,
      agenda,
      attendees: attendees || [],
      checkInCode: crypto.randomBytes(4).toString("hex").toUpperCase(),
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/list", async (req, res) => {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "userEmail is required",
      });
    }

    const events = await Event.find({ userEmail }).sort({ startDateTime: 1 });

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/discovery", async (req, res) => {
  try {
    const events = await Event.find({
      visibility: "public",
      isCancelled: false,
      startDateTime: { $gte: new Date() },
    }).sort({ startDateTime: 1 });

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({
      success: true,
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/rsvp", async (req, res) => {
  try {
    const { eventId, userEmail, status } = req.body;

    if (!eventId || !userEmail || !status) {
      return res.status(400).json({
        success: false,
        message: "eventId, userEmail and status are required",
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    event.rsvpStatus = status;

    const attendeeIndex = event.attendees.findIndex(
      (a) => a.email === userEmail
    );

    if (attendeeIndex >= 0) {
      event.attendees[attendeeIndex].status = status;
    } else {
      event.attendees.push({
        email: userEmail,
        status,
      });
    }

    await event.save();

    res.json({
      success: true,
      message: "RSVP updated successfully",
      event,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/notes", async (req, res) => {
  try {
    const { eventId, notes } = req.body;

    const event = await Event.findByIdAndUpdate(
      eventId,
      { notes },
      { new: true }
    );

    res.json({
      success: true,
      message: "Event notes updated",
      event,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/action-item", async (req, res) => {
  try {
    const { eventId, title } = req.body;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    event.actionItems.push({ title });
    await event.save();

    res.json({
      success: true,
      message: "Action item added",
      event,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/check-in", async (req, res) => {
  try {
    const { eventId, email, checkInCode } = req.body;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.checkInCode !== checkInCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid check-in code",
      });
    }

    const alreadyCheckedIn = event.checkedInAttendees.some(
      (a) => a.email === email
    );

    if (!alreadyCheckedIn) {
      event.checkedInAttendees.push({
        email,
        checkedInAt: new Date(),
      });
    }

    await event.save();

    res.json({
      success: true,
      message: "Check-in successful",
      event,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;