const express = require("express");
const { google } = require("googleapis");

const CalendarEvent = require("../models/CalendarEvent");
const GoogleToken = require("../models/GoogleToken");

const router = express.Router();

const crypto = require("crypto");
const CalendarWatch = require("../models/CalendarWatch");


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
  calendarId,
  colorId,
} = req.body;

const targetCalendarId = calendarId || "primary";

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
      colorId: colorId || "1",
      summary: title,
      description: description || "",
      location: location || "",
      extendedProperties: {
      private: {
      category: category || "General",
      priority: priority || "Medium",
      },
      },
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
      calendarId: targetCalendarId,
      requestBody: googleEventPayload,
      sendUpdates: "all",
    });

    const event = await CalendarEvent.create({
      userEmail: normalizedEmail,
      taskId: taskId || "",
      googleEventId: googleResponse.data.id || "",
      htmlLink: googleResponse.data.htmlLink || "",
      calendarId: targetCalendarId,
      title,
      description: description || "",
      location: location || "",
      category: category || "General",
      priority: priority || "Medium",
      colorId: colorId || "1",
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

router.get("/sync/:userEmail", async (req, res) => {
  try {
    const userEmail = req.params.userEmail.toLowerCase();

    const googleToken = await GoogleToken.findOne({
      userEmail,
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

    const now = new Date();
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const googleEvents = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: sixMonthsLater.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const holidayEvents = await calendar.events.list({
      calendarId: "en.indian#holiday@group.v.calendar.google.com",
      timeMin: now.toISOString(),
      timeMax: sixMonthsLater.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
     });

    const userItems = googleEvents.data.items || [];
    const holidayItems = (holidayEvents.data.items || []).map((item) => ({
      ...item,
      isHoliday: true,
     }));

     const items = [...userItems, ...holidayItems];

    for (const item of items) {
      if (!item.id || !item.summary) continue;

      const start =
        item.start?.dateTime || item.start?.date;

      const end =
        item.end?.dateTime || item.end?.date;

      if (!start || !end) continue;

      await CalendarEvent.findOneAndUpdate(
        {
          userEmail,
          googleEventId: item.id,
        },
        {
          userEmail,
          googleEventId: item.id,
          htmlLink: item.htmlLink || "",
          calendarId: item.isHoliday
            ? "en.indian#holiday@group.v.calendar.google.com"
            : "primary",
          title: item.summary || "Untitled Event",
          description: item.description || "",
          location: item.location || "",
          category: item.isHoliday
            ? "Holiday"
            : item.extendedProperties?.private?.category || "Google Calendar",
          priority: item.isHoliday
            ? "Low"
            : item.extendedProperties?.private?.priority || "Medium",
          colorId: item.isHoliday ? "11" : item.colorId || "1",
          startDateTime: new Date(start),
          endDateTime: new Date(end),
          attendees: item.attendees
            ? item.attendees.map((a) => a.email).filter(Boolean)
            : [],
          videoLink: item.hangoutLink || "",
          recurrenceRule: item.recurrence ? item.recurrence.join(",") : "",
          syncStatus: "google_synced",
        },
        {
          upsert: true,
          returnDocument: "after",
        }
      );
    }

    const syncedEvents = await CalendarEvent.find({
      userEmail,
    }).sort({ startDateTime: 1 });

    return res.json({
      success: true,
      message: "Google Calendar synced successfully",
      syncedCount: items.length,
      events: syncedEvents,
    });
  } catch (error) {
    console.error("Google calendar sync error:", error);

    return res.status(500).json({
      success: false,
      message: "Google calendar sync failed",
      error: error.message,
    });
  }
});

router.get("/google-calendars/:userEmail", async (req, res) => {
  try {
    const userEmail = req.params.userEmail.toLowerCase();

    const googleToken = await GoogleToken.findOne({
      userEmail,
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

    const calendarList = await calendar.calendarList.list();

    const calendars = (calendarList.data.items || []).map((item) => ({
      id: item.id,
      summary: item.summary,
      description: item.description || "",
      primary: item.primary || false,
      accessRole: item.accessRole || "",
      backgroundColor: item.backgroundColor || "",
      foregroundColor: item.foregroundColor || "",
    }));

    return res.json({
      success: true,
      calendars,
    });
  } catch (error) {
    console.error("Google calendars list error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load Google calendars",
      error: error.message,
    });
  }
});



router.post("/watch/start", async (req, res) => {
  try {
    const { userEmail, calendarId } = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "userEmail is required",
      });
    }

    const normalizedEmail = userEmail.toLowerCase();
    const targetCalendarId = calendarId || "primary";

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

    const channelId = crypto.randomUUID();

    const response = await calendar.events.watch({
      calendarId: targetCalendarId,
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: "https://my-biz-backend.onrender.com/api/calendar/webhook",
      },
    });

    await CalendarWatch.create({
      userEmail: normalizedEmail,
      calendarId: targetCalendarId,
      channelId,
      resourceId: response.data.resourceId || "",
      expiration: Number(response.data.expiration || 0),
    });

    return res.json({
      success: true,
      message: "Google Calendar watch started",
      watch: response.data,
    });
  } catch (error) {
    console.error("Watch start error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start Google Calendar watch",
      error: error.message,
    });
  }
});





router.post("/webhook", async (req, res) => {
  try {
    const channelId = req.headers["x-goog-channel-id"];
    const resourceState = req.headers["x-goog-resource-state"];

    if (!channelId) {
      return res.status(400).send("Missing channel id");
    }

    const watch = await CalendarWatch.findOne({
      channelId,
    });

    if (!watch) {
      return res.status(200).send("Unknown watch ignored");
    }

    if (resourceState === "sync") {
      return res.status(200).send("Initial sync notification received");
    }

    await syncGoogleCalendarToMongo(
      watch.userEmail,
      watch.calendarId || "primary"
    );

    return res.status(200).send("Webhook synced");
  } catch (error) {
    console.error("Calendar webhook error:", error);
    return res.status(200).send("Webhook received with error");
  }
});





async function syncGoogleCalendarToMongo(userEmail, calendarId = "primary") {
  const googleToken = await GoogleToken.findOne({
    userEmail: userEmail.toLowerCase(),
  });

  if (!googleToken) {
    throw new Error("Google Calendar is not connected for this email");
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

  const now = new Date();
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  const googleEvents = await calendar.events.list({
    calendarId,
    timeMin: now.toISOString(),
    timeMax: sixMonthsLater.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const items = googleEvents.data.items || [];

  for (const item of items) {
    if (!item.id || !item.summary) continue;

    const start = item.start?.dateTime || item.start?.date;
    const end = item.end?.dateTime || item.end?.date;

    if (!start || !end) continue;

    await CalendarEvent.findOneAndUpdate(
      {
        userEmail: userEmail.toLowerCase(),
        googleEventId: item.id,
      },
      {
        userEmail: userEmail.toLowerCase(),
        googleEventId: item.id,
        htmlLink: item.htmlLink || "",
        calendarId,
        title: item.summary || "Untitled Event",
        description: item.description || "",
        location: item.location || "",
        category:
          item.extendedProperties?.private?.category || "Google Calendar",
        priority:
          item.extendedProperties?.private?.priority || "Medium",
        colorId: item.colorId || "1",
        startDateTime: new Date(start),
        endDateTime: new Date(end),
        attendees: item.attendees
          ? item.attendees.map((a) => a.email).filter(Boolean)
          : [],
        videoLink: item.hangoutLink || "",
        recurrenceRule: item.recurrence ? item.recurrence.join(",") : "",
        syncStatus: "google_synced",
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );
  }

  return items.length;
}

module.exports = router;