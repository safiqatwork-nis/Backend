const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const calendarRoutes = require("./routes/calendarRoutes");
const googleRoutes = require("./routes/googleRoutes");
const eventRoutes = require("./routes/eventRoutes");
const networkRoutes = require("./routes/networkRoutes");
const scannedCardRoutes = require("./routes/scannedCardRoutes");
const liveMapRoutes = require("./routes/liveMapRoutes");
const http = require("http");
const { Server } = require("socket.io");
const initLiveMapSocket = require("./socket/liveMapSocket");


const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

//Test Route
app.get("/", (req, res) => {
  res.send("My Biz API Running");
});

app.use("/api/events", eventRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/scanned-cards", scannedCardRoutes);
app.use("/api/live-map", liveMapRoutes);

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected");

  const PORT = process.env.PORT || 5001;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

initLiveMapSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


})
.catch((err) => {
    console.log(err);
});