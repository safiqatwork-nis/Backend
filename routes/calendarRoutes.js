const express = require("express");
const { google } = require("googleapis");

const CalendarEvent = require("../models/CalendarEvent");
const GoogleToken = require("../models/GoogleToken");

const router = express.Router();

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

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

    const normalizedEmail = userEmail.toLowerCase();

    const conflict = await CalendarEvent.findOne({
      userEmail: normalizedEmail,
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

    const googleToken = await GoogleToken.findOne({
      userEmail: normalizedEmail,
    });

    if (!googleToken) {
      return res.status(401).json({
        success: false,
        message: "Google Calendar is not connected for this email",
      });
    }

    const oauth2Client = createOAuthClient();

    oauth2Client.setCredentials({
      access_token: googleToken.accessToken,
      refresh_token: googleToken.refreshToken,
      expiry_date: googleToken.expiryDate,
      token_type: googleToken.tokenType,
      scope: googleToken.scope,
    });

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const googleEventPayload = {
      summary: title,
      description: description || "",
      location: location || "",
      start: {
        dateTime: new Date(startDateTime).toISOString(),
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: new Date(endDateTime).toISOString(),
        timeZone: "Asia/Kolkata",
      },
      attendees: Array.isArray(attendees)
        ? attendees
            .filter((email) => email && String(email).trim() !== "")
            .map((email) => ({ email }))
        : [],
    };

    if (recurrenceRule && recurrenceRule.trim() !== "") {
      googleEventPayload.recurrence = [recurrenceRule];
    }

    if (videoLink && videoLink.trim() !== "") {
      googleEventPayload.description =
        `${description || ""}\n\nVideo Link: ${videoLink}`.trim();
    }

    const googleResponse = await calendar.events.insert({
      calendarId: "primary",
      requestBody: googleEventPayload,
      sendUpdates: "all",
    });

    const event = await CalendarEvent.create({
      userEmail: normalizedEmail,
      taskId: taskId || "",
      googleEventId: googleResponse.data.id || "",
      calendarId: "primary",
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
      syncStatus: "google_synced",
    });

    return res.status(201).json({
      success: true,
      message: "Calendar event created and synced with Google Calendar",
      event,
      googleEvent: googleResponse.data,
    });
  } catch (error) {
    console.error("Create calendar event error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating Google Calendar event",
      error: error.message,
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
  console.error("FULL ERROR:", error);

  return res.status(500).json({
    success: false,
    message: "Server error",
    error: error.message,
    details: error,
  });
}
});

module.exports = router;