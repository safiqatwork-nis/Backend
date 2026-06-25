const express = require("express");
const router = express.Router();

const {
  updateLocation,
  getMapConnections,
  getPrivacy,
  updatePrivacy,
  getLocationHistory,
} = require("../controllers/liveMapController");
const {
  createProximityAlert,
  getProximityAlerts,
  updateProximityAlert,
  deleteProximityAlert,
} = require("../controllers/proximityAlertController");

router.post("/update-location", updateLocation);
router.get("/connections", getMapConnections);
router.get("/privacy", getPrivacy);
router.put("/privacy", updatePrivacy);
router.get("/history", getLocationHistory);
router.post("/proximity-alerts", createProximityAlert);
router.get("/proximity-alerts", getProximityAlerts);
router.put("/proximity-alerts/:id", updateProximityAlert);
router.delete("/proximity-alerts/:id", deleteProximityAlert);

module.exports = router;