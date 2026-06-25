const LiveLocation = require("../models/LiveLocation");
const LocationPrivacy = require("../models/LocationPrivacy");
const LocationHistory = require("../models/LocationHistory");
const Connection = require("../models/Connection"); 
const ProximityAlert = require("../models/ProximityAlert");
const onlineUsers = new Map();

const getConnectedEmails = async (userEmail) => {
  const connections = await Connection.find({
    $or: [{ senderEmail: userEmail }, { receiverEmail: userEmail }],
    status: "accepted",
  });

  return connections.map((c) =>
    c.senderEmail === userEmail ? c.receiverEmail : c.senderEmail
  );
};

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {

    const R = 6371000;

    const dLat = (lat2-lat1) * Math.PI / 180;
    const dLon = (lon2-lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI/180) *
        Math.cos(lat2 * Math.PI/180) *
        Math.sin(dLon/2) *
        Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}
const initLiveMapSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Live map socket connected:", socket.id);

    socket.on("join_live_map", async ({ userEmail }) => {
      if (!userEmail) return;

      onlineUsers.set(userEmail, socket.id);
      socket.join(userEmail);

      await LiveLocation.findOneAndUpdate(
        { userEmail },
        { isOnline: true, lastSeenAt: new Date() }
      );

      console.log(`${userEmail} joined live map`);
    });

    socket.on("update_live_location", async (data) => {
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
        } = data;

        if (!userEmail || latitude == null || longitude == null) return;

        const privacy = await LocationPrivacy.findOne({ userEmail });

        if (privacy?.ghostMode || privacy?.shareLiveLocation === false) {
          await LiveLocation.deleteOne({ userEmail });
          return;
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
        const alerts = await ProximityAlert.find({
    enabled: true,
    targetEmail: userEmail,
});

for (const alert of alerts) {

    const watcherLocation =
        await LiveLocation.findOne({
            userEmail: alert.userEmail,
        });

    if (!watcherLocation)
        continue;

    const watcherLat =
        watcherLocation.location.coordinates[1];

    const watcherLng =
        watcherLocation.location.coordinates[0];

    const distance =
        calculateDistanceMeters(
            watcherLat,
            watcherLng,
            latitude,
            longitude,
        );

    if (distance <= alert.radiusMeters) {
  const now = new Date();

  if (
    alert.lastTriggeredAt &&
    now - new Date(alert.lastTriggeredAt) < 10 * 60 * 1000
  ) {
    continue;
  }

  io.to(alert.userEmail).emit("proximity_alert", {
    targetEmail: userEmail,
    distance: Math.round(distance),
    radius: alert.radiusMeters,
    city,
    name,
    avatarEmoji,
  });

  await ProximityAlert.findByIdAndUpdate(alert._id, {
    lastTriggeredAt: now,
  });
}

}

        const connectedEmails = await getConnectedEmails(userEmail);

        connectedEmails.forEach((email) => {
          io.to(email).emit("connection_location_updated", {
            userEmail,
            location: liveLocation,
          });
        });
      } catch (error) {
        console.error("Socket location update error:", error.message);
      }
    });

    socket.on("disconnect", async () => {
      try {
        let disconnectedEmail = null;

        for (const [email, socketId] of onlineUsers.entries()) {
          if (socketId === socket.id) {
            disconnectedEmail = email;
            onlineUsers.delete(email);
            break;
          }
        }

        if (disconnectedEmail) {
          await LiveLocation.findOneAndUpdate(
            { userEmail: disconnectedEmail },
            {
              isOnline: false,
              lastSeenAt: new Date(),
            }
          );

          const connectedEmails = await getConnectedEmails(disconnectedEmail);

          connectedEmails.forEach((email) => {
            io.to(email).emit("connection_went_offline", {
              userEmail: disconnectedEmail,
              lastSeenAt: new Date(),
            });
          });
        }
      } catch (error) {
        console.error("Socket disconnect error:", error.message);
      }
    });
  });
};

module.exports = initLiveMapSocket;