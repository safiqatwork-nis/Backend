"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  CalendarDays,
  MapPin,
  Ticket,
  Users,
  IndianRupee,
  Trash2,
  RefreshCcw,
  LogOut,
  PlusCircle,
  Eye,
  X,
  CheckCircle2,
} from "lucide-react";

const API_BASE = "https://my-biz-backend.onrender.com/api/events";

const emptyForm = {
  createdByEmail: "admin@mybiz.com",
  title: "",
  description: "",
  eventType: "networking",
  district: "",
  city: "",
  venue: "",
  address: "",
  startDateTime: "",
  endDateTime: "",
  capacity: "",
  ticketPrice: "",
  agenda: "",
  imageUrl: "",
  status: "published",
};

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  const [editingEventId, setEditingEventId] = useState(null);
  const [liveUpdates, setLiveUpdates] = useState({});

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const saved = localStorage.getItem("myBizAdminLoggedIn");
    if (saved === "true") {
      setLoggedIn(true);
      fetchEvents();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();

    if (login.email === "admin@mybiz.com" && login.password === "admin123") {
      localStorage.setItem("myBizAdminLoggedIn", "true");
      setLoggedIn(true);
      fetchEvents();
      return;
    }

    alert("Invalid admin email or password");
  };

  const logout = () => {
    localStorage.removeItem("myBizAdminLoggedIn");
    setLoggedIn(false);
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/admin/list`);
      setEvents(res.data.events || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const openBookingsPanel = async (event) => {
    try {
      setSelectedEvent(event);
      setPanelLoading(true);

      const [bookingRes, analyticsRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/bookings/${event._id}`),
        axios.get(`${API_BASE}/admin/analytics/${event._id}`),
      ]);

      setBookings(bookingRes.data.bookings || []);
      setAnalytics(analyticsRes.data.analytics || null);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to fetch event data");
    } finally {
      setPanelLoading(false);
    }
  };

  const closePanel = () => {
    setSelectedEvent(null);
    setBookings([]);
    setAnalytics(null);
  };

  const handleChange = (e) => {
    setForm((old) => ({
      ...old,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingEventId(null);
  };

  const createEvent = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        ticketPrice: Number(form.ticketPrice),
        startDateTime: new Date(form.startDateTime).toISOString(),
        endDateTime: new Date(form.endDateTime).toISOString(),
      };

      await axios.post(`${API_BASE}/admin/create`, payload);

      alert("Event created successfully");
      resetForm();
      fetchEvents();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create event");
    }
  };

  const startEditEvent = (event) => {
    setEditingEventId(event._id);

    setForm({
      createdByEmail: event.createdByEmail || "admin@mybiz.com",
      title: event.title || "",
      description: event.description || "",
      eventType: event.eventType || "networking",
      district: event.district || "",
      city: event.city || "",
      venue: event.venue || "",
      address: event.address || "",
      startDateTime: event.startDateTime
        ? new Date(event.startDateTime).toISOString().slice(0, 16)
        : "",
      endDateTime: event.endDateTime
        ? new Date(event.endDateTime).toISOString().slice(0, 16)
        : "",
      capacity: event.capacity || "",
      ticketPrice: event.ticketPrice || "",
      agenda: event.agenda || "",
      imageUrl: event.imageUrl || "",
      status: event.status || "published",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateEvent = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        ticketPrice: Number(form.ticketPrice),
        startDateTime: new Date(form.startDateTime).toISOString(),
        endDateTime: new Date(form.endDateTime).toISOString(),
      };

      await axios.put(`${API_BASE}/admin/update/${editingEventId}`, payload);

      alert("Event updated successfully");
      resetForm();
      fetchEvents();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update event");
    }
  };

  const cancelEvent = async (eventId) => {
    const ok = window.confirm("Cancel this event?");
    if (!ok) return;

    try {
      await axios.put(`${API_BASE}/admin/update/${eventId}`, {
        status: "cancelled",
        liveUpdateMessage: "This event has been cancelled.",
      });

      alert("Event cancelled");
      fetchEvents();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to cancel event");
    }
  };

  const sendLiveUpdate = async (eventId) => {
    const message = liveUpdates[eventId] || "";

    if (!message.trim()) {
      alert("Enter live update message");
      return;
    }

    try {
      await axios.put(`${API_BASE}/admin/update/${eventId}`, {
        liveUpdateMessage: message.trim(),
      });

      alert("Live update saved");

      setLiveUpdates((old) => ({
        ...old,
        [eventId]: "",
      }));

      fetchEvents();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to send live update");
    }
  };

  const deleteEvent = async (eventId) => {
    const ok = window.confirm("Are you sure want to delete this event?");
    if (!ok) return;

    try {
      await axios.delete(`${API_BASE}/admin/delete/${eventId}`);
      alert("Event deleted successfully");
      fetchEvents();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete event");
    }
  };

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#2563eb55,transparent_35%),radial-gradient(circle_at_bottom_right,#7c3aed55,transparent_35%)]" />

        <form
          onSubmit={handleLogin}
          className="relative w-full max-w-md rounded-[32px] bg-white/95 p-8 shadow-2xl"
        >
          <div className="mb-7">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center font-black text-lg shadow-lg">
              MB
            </div>

            <h1 className="mt-5 text-3xl font-black text-slate-950">
              My_Biz Admin
            </h1>

            <p className="mt-2 text-slate-500">
              Manage meetups, tickets, bookings and event check-ins.
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Admin email"
              value={login.email}
              onChange={(e) => setLogin({ ...login, email: e.target.value })}
              className="input"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={login.password}
              onChange={(e) =>
                setLogin({ ...login, password: e.target.value })
              }
              className="input"
              required
            />

            <button className="primary-btn w-full">Login</button>
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            Demo: admin@mybiz.com / admin123
          </p>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-72 bg-slate-950 text-white p-6 flex-col">
          <div>
            <div className="text-3xl font-black">My_Biz</div>
            <p className="mt-1 text-sm text-slate-400">
              Events Admin Console
            </p>
          </div>

          <nav className="mt-10 space-y-3">
            <button className="side-active">
              <CalendarDays size={18} />
              Events
            </button>
            <button className="side-link">
              <Ticket size={18} />
              Bookings
            </button>
            <button className="side-link">
              <Users size={18} />
              Attendees
            </button>
            <button className="side-link">
              <IndianRupee size={18} />
              Revenue
            </button>
          </nav>

          <button onClick={logout} className="mt-auto side-logout">
            <LogOut size={18} />
            Logout
          </button>
        </aside>

        <section className="flex-1 p-5 lg:p-8">
          <header className="rounded-[28px] bg-white p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <h1 className="text-3xl font-black text-slate-950">
                Events Management
              </h1>
              <p className="mt-1 text-slate-500">
                Create district-wise business meetups and manage bookings.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={fetchEvents} className="secondary-btn">
                <RefreshCcw size={17} />
                Refresh
              </button>

              <button onClick={logout} className="danger-btn lg:hidden">
                Logout
              </button>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-6">
            <form
              onSubmit={editingEventId ? updateEvent : createEvent}
              className="rounded-[28px] bg-white p-6 shadow-sm border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <PlusCircle size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    {editingEventId ? "Edit Event" : "Create Event"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {editingEventId
                      ? "Update event details, venue, price or status."
                      : "Publish event for all app users."}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  name="title"
                  placeholder="Event title"
                  value={form.title}
                  onChange={handleChange}
                  className="input"
                  required
                />

                <textarea
                  name="description"
                  placeholder="Description"
                  value={form.description}
                  onChange={handleChange}
                  className="input min-h-24"
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    name="eventType"
                    value={form.eventType}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="networking">Networking</option>
                    <option value="startup">Startup</option>
                    <option value="pitch">Pitch</option>
                    <option value="workshop">Workshop</option>
                    <option value="seminar">Seminar</option>
                    <option value="business">Business</option>
                    <option value="other">Other</option>
                  </select>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="district"
                    placeholder="District"
                    value={form.district}
                    onChange={handleChange}
                    className="input"
                    required
                  />

                  <input
                    name="city"
                    placeholder="City"
                    value={form.city}
                    onChange={handleChange}
                    className="input"
                  />
                </div>

                <input
                  name="venue"
                  placeholder="Venue"
                  value={form.venue}
                  onChange={handleChange}
                  className="input"
                  required
                />

                <input
                  name="address"
                  placeholder="Full address"
                  value={form.address}
                  onChange={handleChange}
                  className="input"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="datetime-local"
                    name="startDateTime"
                    value={form.startDateTime}
                    onChange={handleChange}
                    className="input"
                    required
                  />

                  <input
                    type="datetime-local"
                    name="endDateTime"
                    value={form.endDateTime}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    name="capacity"
                    placeholder="Capacity"
                    value={form.capacity}
                    onChange={handleChange}
                    className="input"
                    required
                  />

                  <input
                    type="number"
                    name="ticketPrice"
                    placeholder="Ticket price"
                    value={form.ticketPrice}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>

                <textarea
                  name="agenda"
                  placeholder="Agenda"
                  value={form.agenda}
                  onChange={handleChange}
                  className="input min-h-24"
                />

                <input
                  name="imageUrl"
                  placeholder="Image URL optional"
                  value={form.imageUrl}
                  onChange={handleChange}
                  className="input"
                />

                <button className="primary-btn w-full">
                  {editingEventId ? "Update Event" : "Publish Event"}
                </button>

                {editingEventId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="secondary-btn w-full"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>

            <div className="rounded-[28px] bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Events List
                  </h2>
                  <p className="text-sm text-slate-500">
                    {events.length} events available
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="empty-box">Loading events...</div>
              ) : events.length === 0 ? (
                <div className="empty-box">
                  No events created yet. Create your first meetup.
                </div>
              ) : (
                <div className="grid gap-4">
                  {events.map((event) => (
                    <div
                      key={event._id}
                      className="rounded-3xl border border-slate-200 p-5 hover:shadow-md transition bg-white"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span
                              className={
                                event.status === "cancelled"
                                  ? "badge-red"
                                  : "badge-green"
                              }
                            >
                              {event.status}
                            </span>
                            <span className="badge-blue">
                              {event.eventType}
                            </span>
                          </div>

                          <h3 className="text-xl font-black text-slate-950">
                            {event.title}
                          </h3>

                          <div className="mt-3 grid gap-2 text-sm text-slate-600">
                            <p className="flex items-center gap-2">
                              <MapPin size={16} />
                              {event.venue}, {event.district}
                            </p>

                            <p className="flex items-center gap-2">
                              <CalendarDays size={16} />
                              {new Date(event.startDateTime).toLocaleString()}
                            </p>

                            <p className="flex items-center gap-2">
                              <Ticket size={16} />₹{event.ticketPrice} ·{" "}
                              {event.capacity} seats
                            </p>
                          </div>

                          {event.liveUpdateMessage && (
                            <div className="mt-3 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-700">
                              Live Update: {event.liveUpdateMessage}
                            </div>
                          )}

                          <div className="mt-3 flex flex-col md:flex-row gap-2">
                            <input
                              placeholder="Live update message"
                              value={liveUpdates[event._id] || ""}
                              onChange={(e) =>
                                setLiveUpdates((old) => ({
                                  ...old,
                                  [event._id]: e.target.value,
                                }))
                              }
                              className="input"
                            />

                            <button
                              type="button"
                              onClick={() => sendLiveUpdate(event._id)}
                              className="secondary-btn"
                            >
                              Send
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openBookingsPanel(event)}
                            className="secondary-btn"
                          >
                            <Eye size={17} />
                            Bookings
                          </button>

                          <button
                            type="button"
                            onClick={() => startEditEvent(event)}
                            className="secondary-btn"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => cancelEvent(event._id)}
                            className="danger-btn"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteEvent(event._id)}
                            className="danger-icon"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </section>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex justify-end">
          <div className="w-full max-w-3xl h-full bg-white p-6 overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  {selectedEvent.title}
                </h2>
                <p className="text-slate-500 mt-1">
                  Bookings, check-ins and revenue analytics
                </p>
              </div>

              <button onClick={closePanel} className="danger-icon">
                <X size={20} />
              </button>
            </div>

            {panelLoading ? (
              <div className="empty-box mt-6">Loading booking data...</div>
            ) : (
              <>
                {analytics && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                    <StatCard
                      title="Bookings"
                      value={analytics.totalBookings}
                    />
                    <StatCard title="Paid" value={analytics.paidBookings} />
                    <StatCard
                      title="Checked-in"
                      value={analytics.checkedIn}
                    />
                    <StatCard
                      title="Remaining"
                      value={analytics.remainingSeats}
                    />
                    <StatCard
                      title="Attendance"
                      value={`${analytics.attendanceRate}%`}
                    />
                    <StatCard
                      title="Revenue"
                      value={`₹${analytics.revenueCollected}`}
                    />
                  </div>
                )}

                <div className="mt-7">
                  <h3 className="text-lg font-black text-slate-950 mb-4">
                    Booking List
                  </h3>

                  {bookings.length === 0 ? (
                    <div className="empty-box">No bookings yet.</div>
                  ) : (
                    <div className="grid gap-3">
                      {bookings.map((booking) => (
                        
                        <div
                          key={booking._id}
                          className="rounded-3xl border border-slate-200 p-5 bg-slate-50"
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <h4 className="font-black text-slate-950">
                                {booking.userName || "User"}
                              </h4>
                              <p className="text-sm text-slate-500">
                                {booking.userEmail}
                              </p>
                              <p className="text-sm text-slate-500">
                                Ticket: {booking.ticketId}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <StatusBadge label={booking.bookingStatus} />
<StatusBadge label={booking.paymentStatus} />
<StatusBadge
  label={
    booking.checkedIn
      ? "checked-in"
      : "not checked-in"
  }
/>
<StatusBadge
  label={booking.googleEventId ? "google synced" : "not synced"}
/>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
  <button
    onClick={() => {
      navigator.clipboard.writeText(booking.ticketId);
      alert("Ticket ID copied");
    }}
    className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-black"
  >
    Copy Ticket ID
  </button>

  <a
    href={booking.qrVerifyUrl}
    target="_blank"
    rel="noreferrer"
    className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black"
  >
    Verify Ticket
  </a>

  {booking.googleHtmlLink && (
    <a
      href={booking.googleHtmlLink}
      target="_blank"
      rel="noreferrer"
      className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-black"
    >
      Google Calendar
    </a>
  )}
</div>

                          {booking.checkedIn && (
                            <p className="mt-3 text-sm text-green-700 font-bold flex items-center gap-2">
                              <CheckCircle2 size={16} />
                              Checked-in at{" "}
                              {new Date(booking.checkedInAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <h3 className="mt-2 text-2xl font-black text-slate-950">{value}</h3>
    </div>
  );
}

function StatusBadge({ label }) {
  const text = String(label || "").toUpperCase();

 const isGood =
  text.includes("PAID") ||
  text.includes("CHECKED") ||
  text.includes("BOOKED") ||
  text.includes("SYNCED");

  const isPending =
    text.includes("PENDING") ||
    text.includes("NOT");

  const isDanger =
    text.includes("CANCELLED") ||
    text.includes("FAILED") ||
    text.includes("REFUNDED");

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        isDanger
          ? "bg-red-100 text-red-700"
          : isGood
          ? "bg-green-100 text-green-700"
          : isPending
          ? "bg-yellow-100 text-yellow-700"
          : "bg-slate-200 text-slate-700"
      }`}
    >
      {text}
    </span>
  );
}