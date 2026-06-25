const ProximityAlert = require("../models/ProximityAlert");

exports.createProximityAlert = async (req, res) => {
  try {
    const { userEmail, targetEmail, radiusMeters } = req.body;

    if (!userEmail || !targetEmail) {
      return res.status(400).json({
        success: false,
        message: "userEmail and targetEmail are required",
      });
    }

    const alert = await ProximityAlert.findOneAndUpdate(
      { userEmail, targetEmail },
      {
        userEmail,
        targetEmail,
        radiusMeters: radiusMeters || 1000,
        enabled: true,
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Proximity alert saved",
      data: alert,
    });
  } catch (error) {
    console.error("Create proximity alert error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save proximity alert",
      error: error.message,
    });
  }
};

exports.getProximityAlerts = async (req, res) => {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "userEmail is required",
      });
    }

    const alerts = await ProximityAlert.find({ userEmail }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Get proximity alerts error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch proximity alerts",
      error: error.message,
    });
  }
};

exports.updateProximityAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { radiusMeters, enabled } = req.body;

    const alert = await ProximityAlert.findByIdAndUpdate(
      id,
      { radiusMeters, enabled },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Proximity alert not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Proximity alert updated",
      data: alert,
    });
  } catch (error) {
    console.error("Update proximity alert error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update proximity alert",
      error: error.message,
    });
  }
};

exports.deleteProximityAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await ProximityAlert.findByIdAndDelete(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Proximity alert not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Proximity alert deleted",
    });
  } catch (error) {
    console.error("Delete proximity alert error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete proximity alert",
      error: error.message,
    });
  }
};