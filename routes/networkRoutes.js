const express = require("express");

const UserProfile = require("../models/UserProfile");
const ConnectionRequest = require("../models/ConnectionRequest");
const Connection = require("../models/Connection");
const Interaction = require("../models/Interaction");
const IntroductionRequest = require("../models/IntroductionRequest");

const router = express.Router();

/* CREATE / UPDATE PROFILE */
router.post("/profile/create", async (req, res) => {
  try {
    const {
      email,
      name,
      phone,
      headline,
      companyName,
      role,
      industry,
      location,
      bio,
      skills,
      interests,
      profileImage,
    } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Email and name are required",
      });
    }

    const profile = await UserProfile.findOneAndUpdate(
      { email },
      {
        email,
        name,
        phone,
        headline,
        companyName,
        role,
        industry,
        location,
        bio,
        skills,
        interests,
        profileImage,
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Profile saved successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Profile save failed",
      error: error.message,
    });
  }
});

/* GET PROFILE */
router.get("/profile/:email", async (req, res) => {
  try {
    const profile = await UserProfile.findOne({
      email: req.params.email,
    });

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Profile fetch failed",
      error: error.message,
    });
  }
});

/* SEND CONNECTION REQUEST */
router.post("/request/send", async (req, res) => {
  try {
    const { fromEmail, toEmail, note } = req.body;

    if (!fromEmail || !toEmail) {
      return res.status(400).json({
        success: false,
        message: "fromEmail and toEmail are required",
      });
    }

    if (fromEmail === toEmail) {
      return res.status(400).json({
        success: false,
        message: "You cannot connect with yourself",
      });
    }

    const alreadyConnected = await Connection.findOne({
      userEmail: fromEmail,
      connectionEmail: toEmail,
    });

    if (alreadyConnected) {
      return res.status(409).json({
        success: false,
        message: "Already connected",
      });
    }

    const existingRequest = await ConnectionRequest.findOne({
      fromEmail,
      toEmail,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: "Connection request already sent",
      });
    }

    const request = await ConnectionRequest.create({
      fromEmail,
      toEmail,
      note,
    });

    res.status(201).json({
      success: true,
      message: "Connection request sent",
      request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Request send failed",
      error: error.message,
    });
  }
});

/* RECEIVED REQUESTS */
router.get("/request/received/:email", async (req, res) => {
  try {
    const requests = await ConnectionRequest.find({
      toEmail: req.params.email,
      status: "pending",
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Request fetch failed",
      error: error.message,
    });
  }
});

/* ACCEPT REQUEST */
router.post("/request/accept", async (req, res) => {
  try {
    const { requestId, category } = req.body;

    const request = await ConnectionRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    request.status = "accepted";
    await request.save();

    await Connection.create({
      userEmail: request.fromEmail,
      connectionEmail: request.toEmail,
      category: category || "Peer",
      tier: "1st",
      relationshipStrength: 30,
    });

    await Connection.create({
      userEmail: request.toEmail,
      connectionEmail: request.fromEmail,
      category: category || "Peer",
      tier: "1st",
      relationshipStrength: 30,
    });

    res.status(200).json({
      success: true,
      message: "Connection request accepted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Accept request failed",
      error: error.message,
    });
  }
});

/* DECLINE REQUEST */
router.post("/request/decline", async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await ConnectionRequest.findByIdAndUpdate(
      requestId,
      { status: "declined" },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Connection request declined",
      request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Decline request failed",
      error: error.message,
    });
  }
});

/* GET CONNECTIONS */
router.get("/connections/:email", async (req, res) => {
  try {
    const connections = await Connection.find({
      userEmail: req.params.email,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      connections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Connections fetch failed",
      error: error.message,
    });
  }
});

/* UPDATE CATEGORY */
router.post("/category/update", async (req, res) => {
  try {
    const { userEmail, connectionEmail, category } = req.body;

    const connection = await Connection.findOneAndUpdate(
      { userEmail, connectionEmail },
      { category },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Category updated",
      connection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Category update failed",
      error: error.message,
    });
  }
});

/* UPDATE PRIVATE NOTES */
router.post("/notes/update", async (req, res) => {
  try {
    const { userEmail, connectionEmail, notes } = req.body;

    const connection = await Connection.findOneAndUpdate(
      { userEmail, connectionEmail },
      { notes },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Notes updated",
      connection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Notes update failed",
      error: error.message,
    });
  }
});

/* ADD INTERACTION */
router.post("/interaction/add", async (req, res) => {
  try {
    const {
      userEmail,
      connectionEmail,
      type,
      title,
      description,
      interactionDate,
    } = req.body;

    const interaction = await Interaction.create({
      userEmail,
      connectionEmail,
      type,
      title,
      description,
      interactionDate,
    });

    const count = await Interaction.countDocuments({
      userEmail,
      connectionEmail,
    });

    const strength = Math.min(100, 20 + count * 10);

    await Connection.findOneAndUpdate(
      { userEmail, connectionEmail },
      { relationshipStrength: strength }
    );

    res.status(201).json({
      success: true,
      message: "Interaction added",
      interaction,
      relationshipStrength: strength,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Interaction add failed",
      error: error.message,
    });
  }
});

/* GET INTERACTIONS */
router.get("/interaction/:userEmail/:connectionEmail", async (req, res) => {
  try {
    const interactions = await Interaction.find({
      userEmail: req.params.userEmail,
      connectionEmail: req.params.connectionEmail,
    }).sort({ interactionDate: -1 });

    res.status(200).json({
      success: true,
      interactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Interaction fetch failed",
      error: error.message,
    });
  }
});

/* INTRODUCTION REQUEST */
router.post("/introduction/request", async (req, res) => {
  try {
    const { requesterEmail, mutualEmail, targetEmail, note } = req.body;

    const intro = await IntroductionRequest.create({
      requesterEmail,
      mutualEmail,
      targetEmail,
      note,
    });

    res.status(201).json({
      success: true,
      message: "Introduction request sent",
      intro,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Introduction request failed",
      error: error.message,
    });
  }
});

/* SMART SUGGESTIONS */
router.get("/suggestions/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const myProfile = await UserProfile.findOne({ email });

    if (!myProfile) {
      return res.status(200).json({
        success: true,
        suggestions: [],
      });
    }

    const myConnections = await Connection.find({ userEmail: email });
    const connectedEmails = myConnections.map((c) => c.connectionEmail);

    const suggestions = await UserProfile.find({
      email: {
        $nin: [email, ...connectedEmails],
      },
      $or: [
        { industry: myProfile.industry },
        { location: myProfile.location },
        { interests: { $in: myProfile.interests || [] } },
      ],
    }).limit(20);

    res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Suggestions fetch failed",
      error: error.message,
    });
  }
});

/* EXPORT CSV */
router.get("/export/csv/:email", async (req, res) => {
  try {
    const connections = await Connection.find({
      userEmail: req.params.email,
    });

    let csv = "Connection Email,Category,Tier,Relationship Strength,Notes\n";

    connections.forEach((c) => {
      csv += `"${c.connectionEmail}","${c.category}","${c.tier}","${c.relationshipStrength}","${c.notes}"\n`;
    });

    res.header("Content-Type", "text/csv");
    res.attachment("network_connections.csv");
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "CSV export failed",
      error: error.message,
    });
  }
});

module.exports = router;