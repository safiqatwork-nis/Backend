const LiveLocation = require("../models/LiveLocation");
const LocationPrivacy = require("../models/LocationPrivacy");
const LocationHistory = require("../models/LocationHistory");

// TEMP: later we connect exact F6 Connection model here
const Connection = require("../models/Connection");

exports.updateLocation = async (req, res) => {
  try {
    const {
      userEmail,
      name,
      businessName,
      profilePhoto,
      avatarEmoji,
      latitude,
      longitude,
      accuracy,
      city,
    } = req.body;

    if (!userEmail || latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: "userEmail, latitude and longitude are required",
      });
    }

    const privacy = await LocationPrivacy.findOne({ userEmail });

    if (privacy?.ghostMode || privacy?.shareLiveLocation === false) {
      await LiveLocation.deleteOne({ userEmail });

      return res.status(200).json({
        success: true,
        message: "Ghost mode enabled. Live location hidden.",
      });
    }

    const liveLocation = await LiveLocation.findOneAndUpdate(
      { userEmail },
      {
        userEmail,
        name,
        businessName,
        profilePhoto,
        avatarEmoji: avatarEmoji || "👤",
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        accuracy,
        city,
        isOnline: true,
        lastSeenAt: new Date(),
      },
      { new: true, upsert: true }
    );

    await LocationHistory.create({
      userEmail,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      city,
      accuracy,
      recordedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: liveLocation,
    });
  } catch (error) {
    console.error("Update location error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update location",
      error: error.message,
    });
  }
};

exports.getMapConnections = async (req, res) => {
  try {
    const { userEmail, city } = req.query;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "userEmail is required",
      });
    }

    const connections = await Connection.find({
      $or: [{ senderEmail: userEmail }, { receiverEmail: userEmail }],
      status: "accepted",
    });

    const connectionEmails = connections.map((c) =>
      c.senderEmail === userEmail ? c.receiverEmail : c.senderEmail
    );

    const query = {
      userEmail: { $in: connectionEmails },
    };

    if (city && city !== "All") {
      query.city = city;
    }

    const locations = await LiveLocation.find(query).sort({ lastSeenAt: -1 });

    const visibleLocations = [];

    for (const loc of locations) {
      const privacy = await LocationPrivacy.findOne({
        userEmail: loc.userEmail,
      });

      if (privacy?.ghostMode || privacy?.shareLiveLocation === false) {
        continue;
      }

      let finalLocation = loc.toObject();

      if (privacy?.locationPrecision === "approximate") {
        const [lng, lat] = finalLocation.location.coordinates;

        finalLocation.location.coordinates = [
          Number(lng.toFixed(2)),
          Number(lat.toFixed(2)),
        ];
      }

      visibleLocations.push(finalLocation);
    }

    return res.status(200).json({
      success: true,
      message: "Map connections fetched successfully",
      data: visibleLocations,
    });
  } catch (error) {
    console.error("Get map connections error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch map connections",
      error: error.message,
    });
  }
};

exports.getPrivacy = async (req, res) => {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "userEmail is required",
      });
    }

    let privacy = await LocationPrivacy.findOne({ userEmail });

    if (!privacy) {
      privacy = await LocationPrivacy.create({ userEmail });
    }

    return res.status(200).json({
      success: true,
      data: privacy,
    });
  } catch (error) {
    console.error("Get privacy error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch privacy settings",
      error: error.message,
    });
  }
};

exports.updatePrivacy = async (req, res) => {
  try {
    const {
      userEmail,
      ghostMode,
      visibility,
      locationPrecision,
      shareLiveLocation,
    } = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "userEmail is required",
      });
    }

    const privacy = await LocationPrivacy.findOneAndUpdate(
      { userEmail },
      {
        userEmail,
        ghostMode,
        visibility,
        locationPrecision,
        shareLiveLocation,
      },
      { new: true, upsert: true }
    );

    if (ghostMode || shareLiveLocation === false) {
      await LiveLocation.deleteOne({ userEmail });
    }

    return res.status(200).json({
      success: true,
      message: "Privacy updated successfully",
      data: privacy,
    });
  } catch (error) {
    console.error("Update privacy error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update privacy",
      error: error.message,
    });
  }
};

exports.getLocationHistory = async (req, res) => {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "userEmail is required",
      });
    }

    const history = await LocationHistory.find({ userEmail })
      .sort({ recordedAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      message: "Location history fetched successfully",
      data: history,
    });
  } catch (error) {
    console.error("Get location history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch location history",
      error: error.message,
    });
  }
};