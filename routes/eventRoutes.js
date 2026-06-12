const express = require("express");
const crypto = require("crypto");

const Event = require("../models/Event");
const EventBooking = require("../models/EventBooking");

const router = express.Router();

const { google } = require("googleapis");
const GoogleToken = require("../models/GoogleToken");
const CalendarEvent = require("../models/CalendarEvent");

const BASE_URL = process.env.BASE_URL || "https://my-biz-backend.onrender.com";

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// ================================
// ADMIN: CREATE EVENT
// ================================
router.post("/admin/create", async (req, res) => {
  try {
    const {
      createdByEmail,
      title,
      description,
      eventType,
      district,
      city,
      venue,
      address,
      startDateTime,
      endDateTime,
      capacity,
      ticketPrice,
      agenda,
      imageUrl,
      status,
    } = req.body;

    if (!createdByEmail || !title || !district || !venue || !startDateTime || !endDateTime) {
      return res.status(400).json({
        success: false,
        message: "createdByEmail, title, district, venue, startDateTime and endDateTime are required",
      });
    }

    const event = await Event.create({
      createdByEmail,
      title,
      description,
      eventType,
      district,
      city,
      venue,
      address,
      startDateTime,
      endDateTime,
      capacity,
      ticketPrice,
      agenda,
      imageUrl,
      status: status || "published",
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================================
// ADMIN: LIST ALL EVENTS
// ================================
router.get("/admin/list", async (req, res) => {
  try {
    const events = await Event.find().sort({ startDateTime: 1 });

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================================
// ADMIN: UPDATE EVENT
// ================================
router.put("/admin/update/:id", async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================================
// ADMIN: DELETE EVENT
// ================================
router.delete("/admin/delete/:id", async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================================
// USER APP: DISTRICT BASED EVENTS
// Example: /api/events/feed?district=Tirunelveli
// ================================
router.get("/feed", async (req, res) => {
  try {
    const { search } = req.query;

    const filter = {
      status: { $in: ["published", "cancelled"] },
     // startDateTime: { $gte: new Date() },
    };

    if (search && search.trim() !== "") {
      filter.$or = [
        { title: new RegExp(search, "i") },
        { district: new RegExp(search, "i") },
        { city: new RegExp(search, "i") },
        { venue: new RegExp(search, "i") },
        { eventType: new RegExp(search, "i") },
      ];
    }

    const events = await Event.find(filter).sort({ startDateTime: 1 });

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================================
// USER APP: EVENT DETAILS
// ================================
router.get("/details/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const totalBookings = await EventBooking.countDocuments({
      eventId: event._id,
      bookingStatus: "booked",
    });

    const remainingSeats = Math.max(event.capacity - totalBookings, 0);

    res.json({
      success: true,
      event,
      totalBookings,
      remainingSeats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================================
// USER APP: BOOK TICKET
// ================================
router.post("/book", async (req, res) => {
  try {
    const { eventId, userEmail, userName, phone } = req.body;

    if (!eventId || !userEmail) {
      return res.status(400).json({
        success: false,
        message: "eventId and userEmail are required",
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "This event is not available for booking",
      });
    }

    const totalBookings = await EventBooking.countDocuments({
      eventId,
      bookingStatus: "booked",
    });

    if (totalBookings >= event.capacity) {
      return res.status(400).json({
        success: false,
        message: "Event seats are full",
      });
    }

    const alreadyBooked = await EventBooking.findOne({
      eventId,
      userEmail,
      bookingStatus: "booked",
    });

    if (alreadyBooked) {
      return res.status(409).json({
        success: false,
        message: "You already booked this event",
        booking: alreadyBooked,
      });
    }

    const ticketId = `MBT-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const invoiceNumber = `INV-${Date.now()}`;
    const qrVerifyUrl = `${BASE_URL}/api/events/tickets/verify/${ticketId}`;

    const booking = await EventBooking.create({
      eventId,
      userEmail,
      userName,
      phone,
      ticketId,
      qrVerifyUrl,
      ticketPrice: event.ticketPrice,
      paymentStatus: event.ticketPrice > 0 ? "pending" : "paid",
      invoiceNumber,
    });

    res.status(201).json({
      success: true,
      message: "Ticket booked successfully",
      booking,
      event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================================
// TEMP PAYMENT SUCCESS API
// Later Razorpay/Stripe add pannalaam
// ================================
router.post("/payment/success", async (req, res) => {
  try {
    const { bookingId } = req.body;

    let booking = await EventBooking.findByIdAndUpdate(
      bookingId,
      { paymentStatus: "paid" },
      { new: true }
    ).populate("eventId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const event = booking.eventId;
    const normalizedEmail = booking.userEmail.toLowerCase();
    console.log("F5 PAYMENT SUCCESS BOOKING EMAIL:", normalizedEmail);
    console.log("F5 BOOKED EVENT:", event.title);

    // Already Google synced na duplicate create panna vendam
    if (!booking.googleEventId) {
      const googleToken = await GoogleToken.findOne({
        userEmail: normalizedEmail,
      });
      console.log("F5 GOOGLE TOKEN FOUND:", !!googleToken);

      if (googleToken) {
        try {
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
            colorId: "9",
            summary: event.title,
            description: `
My_Biz Event Booking

Ticket ID: ${booking.ticketId}
Invoice: ${booking.invoiceNumber}
Payment Status: PAID

${event.description || ""}
            `.trim(),
            location: `${event.venue || ""}, ${event.address || ""}, ${event.district || ""}`,
            extendedProperties: {
              private: {
                category: "Booked Event",
                priority: "Medium",
                source: "My_Biz_F5",
                ticketId: booking.ticketId,
              },
            },
            start: {
              dateTime: new Date(event.startDateTime).toISOString(),
              timeZone: "Asia/Kolkata",
            },
            end: {
              dateTime: new Date(event.endDateTime).toISOString(),
              timeZone: "Asia/Kolkata",
            },
          };

          const googleResponse = await calendar.events.insert({
            calendarId: "primary",
            requestBody: googleEventPayload,
            sendUpdates: "none",
          });

          booking.googleEventId = googleResponse.data.id || "";
          booking.calendarId = "primary";
          booking.googleHtmlLink = googleResponse.data.htmlLink || "";
          await booking.save();

          await CalendarEvent.findOneAndUpdate(
            {
              userEmail: normalizedEmail,
              googleEventId: googleResponse.data.id,
            },
            {
              userEmail: normalizedEmail,
              taskId: "",
              googleEventId: googleResponse.data.id || "",
              htmlLink: googleResponse.data.htmlLink || "",
              calendarId: "primary",
              title: event.title,
              description: event.description || "",
              location: `${event.venue || ""}, ${event.district || ""}`,
              category: "Booked Event",
              priority: "Medium",
              colorId: "9",
              startDateTime: event.startDateTime,
              endDateTime: event.endDateTime,
              attendees: [],
              videoLink: "",
              recurrenceRule: "",
              syncStatus: "google_synced",
            },
            {
              upsert: true,
              new: true,
            }
          );
        } catch (googleError) {
  console.error("Booked event Google Calendar sync failed:", googleError);

  return res.status(500).json({
    success: false,
    message: "Payment completed but Google Calendar sync failed",
    googleError: googleError.message,
  });
}
      } else {
  console.log("Google Calendar token not found for:", normalizedEmail);

  return res.status(401).json({
    success: false,
    message: `Google Calendar is not connected for ${normalizedEmail}`,
  });
}
    }

    booking = await EventBooking.findById(booking._id).populate("eventId");

    res.json({
      success: true,
      message: booking.googleEventId
        ? "Payment completed and event synced to Google Calendar"
        : "Payment marked as paid",
      booking,
    });
  } catch (error) {
    console.error("Payment success error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================================
// USER APP: MY BOOKINGS
// ================================
router.get("/my-bookings", async (req, res) => {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "userEmail is required",
      });
    }

    const bookings = await EventBooking.find({
      userEmail,
      bookingStatus: "booked",
    })
      .populate("eventId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================================
// ADMIN: EVENT BOOKINGS
// ================================
router.get("/admin/bookings/:eventId", async (req, res) => {
  try {
    const bookings = await EventBooking.find({
      eventId: req.params.eventId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================================
// ADMIN: EVENT ANALYTICS
// ================================
router.get("/admin/analytics/:eventId", async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const totalBookings = await EventBooking.countDocuments({
      eventId: event._id,
      bookingStatus: "booked",
    });

    const paidBookings = await EventBooking.countDocuments({
      eventId: event._id,
      paymentStatus: "paid",
      bookingStatus: "booked",
    });

    const checkedIn = await EventBooking.countDocuments({
      eventId: event._id,
      checkedIn: true,
      bookingStatus: "booked",
    });

    const revenue = await EventBooking.aggregate([
      {
        $match: {
          eventId: event._id,
          paymentStatus: "paid",
          bookingStatus: "booked",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$ticketPrice" },
        },
      },
    ]);

    const attendanceRate =
      totalBookings === 0 ? 0 : Math.round((checkedIn / totalBookings) * 100);

    res.json({
      success: true,
      analytics: {
        eventTitle: event.title,
        capacity: event.capacity,
        totalBookings,
        paidBookings,
        checkedIn,
        remainingSeats: Math.max(event.capacity - totalBookings, 0),
        attendanceRate,
        revenueCollected: revenue.length > 0 ? revenue[0].total : 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================================
// VOLUNTEER: QR VERIFY HTML PAGE
// QR scan pannumbothu browser la open aagum
// ================================
router.get("/tickets/verify/:ticketId", async (req, res) => {
  try {
    const booking = await EventBooking.findOne({
      ticketId: req.params.ticketId,
    }).populate("eventId");

    if (!booking) {
      return res.send(`
        <html>
          <head>
            <title>Invalid Ticket</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: Arial; background:#fff1f2; padding:24px; }
              .card { background:white; padding:24px; border-radius:18px; box-shadow:0 10px 30px rgba(0,0,0,0.1); }
              h1 { color:#dc2626; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Invalid Ticket</h1>
              <p>This ticket is not found in My_Biz event system.</p>
            </div>
          </body>
        </html>
      `);
    }

    const event = booking.eventId;

    const statusColor = booking.checkedIn ? "#f59e0b" : "#16a34a";
    const statusText = booking.checkedIn ? "Already Checked-in" : "Valid Ticket";

    res.send(`
      <html>
        <head>
          <title>Ticket Verification</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #f8fafc;
              padding: 20px;
            }
            .card {
              max-width: 460px;
              margin: auto;
              background: #ffffff;
              border-radius: 20px;
              padding: 24px;
              box-shadow: 0 12px 35px rgba(15,23,42,0.12);
            }
            .badge {
              background: ${statusColor};
              color: white;
              padding: 10px 14px;
              border-radius: 999px;
              display: inline-block;
              font-weight: bold;
              margin-bottom: 18px;
            }
            h1 {
              margin: 0 0 12px;
              color: #0f172a;
              font-size: 24px;
            }
            p {
              color: #475569;
              font-size: 15px;
              line-height: 1.5;
            }
            .row {
              border-top: 1px solid #e2e8f0;
              padding: 12px 0;
            }
            .label {
              color: #64748b;
              font-size: 13px;
            }
            .value {
              color: #0f172a;
              font-weight: bold;
              margin-top: 4px;
            }
            button {
              width: 100%;
              border: none;
              background: #2563eb;
              color: white;
              padding: 15px;
              font-size: 16px;
              border-radius: 14px;
              margin-top: 20px;
              font-weight: bold;
            }
            button:disabled {
              background: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">${statusText}</div>
            <h1>${event.title}</h1>
            <p>${event.venue}, ${event.district}</p>

            <div class="row">
              <div class="label">Ticket ID</div>
              <div class="value">${booking.ticketId}</div>
            </div>

            <div class="row">
              <div class="label">Name</div>
              <div class="value">${booking.userName || "User"}</div>
            </div>

            <div class="row">
              <div class="label">Email</div>
              <div class="value">${booking.userEmail}</div>
            </div>

            <div class="row">
              <div class="label">Payment Status</div>
              <div class="value">${booking.paymentStatus.toUpperCase()}</div>
            </div>

            <div class="row">
              <div class="label">Check-in Status</div>
              <div class="value">${booking.checkedIn ? "Checked-in" : "Not checked-in"}</div>
            </div>

            ${
              booking.checkedIn
                ? `<button disabled>Already Checked-in</button>`
                : `<form method="POST" action="/api/events/tickets/check-in/${booking.ticketId}">
                    <button type="submit">Mark Check-in</button>
                  </form>`
            }
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// ================================
// VOLUNTEER: MARK CHECK-IN
// ================================
router.post("/tickets/check-in/:ticketId", async (req, res) => {
  try {
    const booking = await EventBooking.findOne({
      ticketId: req.params.ticketId,
    }).populate("eventId");

    if (!booking) {
      return res.send("<h1>Invalid Ticket</h1>");
    }

    if (booking.paymentStatus !== "paid") {
      return res.send(`
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: Arial; background:#fff7ed; padding:24px; }
              .card { background:white; padding:24px; border-radius:18px; box-shadow:0 10px 30px rgba(0,0,0,0.1); }
              h1 { color:#ea580c; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Payment Pending</h1>
              <p>This ticket cannot be checked-in because payment status is not paid.</p>
            </div>
          </body>
        </html>
      `);
    }

    if (!booking.checkedIn) {
      booking.checkedIn = true;
      booking.checkedInAt = new Date();
      await booking.save();
    }

    res.redirect(`/api/events/tickets/verify/${booking.ticketId}`);
  } catch (error) {
    res.send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// ================================
// USER APP: CANCEL BOOKING
// ================================
router.post("/booking/cancel", async (req, res) => {
  try {
    const { bookingId, userEmail } = req.body;

    if (!bookingId || !userEmail) {
      return res.status(400).json({
        success: false,
        message: "bookingId and userEmail are required",
      });
    }

    const booking = await EventBooking.findOne({
      _id: bookingId,
      userEmail,
      bookingStatus: "booked",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.checkedIn) {
      return res.status(400).json({
        success: false,
        message: "Checked-in ticket cannot be cancelled",
      });
    }

    booking.bookingStatus = "cancelled";
    await booking.save();

    res.json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;