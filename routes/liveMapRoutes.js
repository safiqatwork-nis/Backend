const express = require("express");
const router = express.Router();

const {
  updateLocation,
  getMapConnections,
  getPrivacy,
  updatePrivacy,
  getLocationHistory,
} = require("../controllers/liveMapController");

router.post("/update-location", updateLocation);
router.get("/connections", getMapConnections);
router.get("/privacy", getPrivacy);
router.put("/privacy", updatePrivacy);
router.get("/history", getLocationHistory);

module.exports = router;