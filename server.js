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


const app = express();

app.use(cors());
app.use(express.json());

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

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected");

  const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
})
.catch((err) => {
    console.log(err);
});