const mongoose = require("mongoose");

const eventBookingSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    userEmail: {
      type: String,
      required: true,
    },

    userName: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    ticketId: {
      type: String,
      required: true,
      unique: true,
    },

    qrVerifyUrl: {
      type: String,
      required: true,
    },

    ticketPrice: {
      type: Number,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    bookingStatus: {
      type: String,
      enum: ["booked", "cancelled"],
      default: "booked",
    },

    invoiceNumber: {
      type: String,
      default: "",
    },

    checkedIn: {
      type: Boolean,
      default: false,
    },

    checkedInAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EventBooking", eventBookingSchema);