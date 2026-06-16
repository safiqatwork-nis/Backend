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
    const email = req.params.email;

    const connections = await Connection.find({
      userEmail: email,
    }).sort({
      relationshipStrength: -1,
    });

    const result = [];

    for (const item of connections) {
      const profile = await UserProfile.findOne({
        email: item.connectionEmail,
      });

      result.push({
        _id: item._id,

        connectionEmail: item.connectionEmail,

        category: item.category,

        tier: item.tier,

        notes: item.notes,

        relationshipStrength:
            item.relationshipStrength,

        profile,
      });
    }

    res.status(200).json({
      success: true,
      connections: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* UPDATE CATEGORY */
router.post("/category/update", async (req, res) => {
  try {
    const { userEmail, connectionPhone, category } = req.body;

    const connection = await Connection.findOneAndUpdate(
      { userEmail, connectionPhone },
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




router.post("/contact/update", async (req, res) => {
  try {
    const {
      userEmail,
      oldConnectionPhone,
      connectionName,
      connectionPhone,
      connectionEmail,
      businessName,
      businessCategory,
      location,
      category,
      notes,
    } = req.body;

    const contact = await Connection.findOneAndUpdate(
      {
        userEmail,
        connectionPhone: oldConnectionPhone,
      },
      {
        connectionName,
        connectionPhone,
        connectionEmail,
        businessName,
        businessCategory,
        location,
        category,
        notes,
      },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      contact,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Contact update failed",
      error: error.message,
    });
  }
});



router.delete("/contact/delete", async (req, res) => {
  try {
    const { userEmail, connectionPhone } = req.body;

    await Connection.deleteOne({
      userEmail,
      connectionPhone,
    });

    await Interaction.deleteMany({
      userEmail,
      connectionPhone,
    });

    res.status(200).json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Contact delete failed",
      error: error.message,
    });
  }
});




/* UPDATE PRIVATE NOTES */
router.post("/notes/update", async (req, res) => {
  try {
    const {
      userEmail,
      connectionPhone,
      notes,
    } = req.body;

    const connection =
      await Connection.findOneAndUpdate(
        {
          userEmail,
          connectionPhone,
        },
        {
          notes,
        },
        {
          new: true,
        }
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
router.post(
  "/interaction/add",
  async (req, res) => {
    try {

      const {
        userEmail,
        connectionPhone,
        type,
        title,
        description,
        interactionDate,
      } = req.body;

      const interaction =
        await Interaction.create({
          userEmail,
          connectionPhone,
          type,
          title,
          description,
          interactionDate,
        });

      const count =
        await Interaction.countDocuments({
          userEmail,
          connectionPhone,
        });

      const strength =
        Math.min(
          100,
          20 + count * 10
        );

      await Connection.findOneAndUpdate(
        {
          userEmail,
          connectionPhone,
        },
        {
          relationshipStrength:
              strength,
        }
      );

      res.status(201).json({
        success: true,
        message:
            "Interaction added",
        interaction,
        relationshipStrength:
            strength,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message:
            "Interaction add failed",
        error:
            error.message,
      });

    }
  }
);

/* GET INTERACTIONS */
router.get(
  "/interaction/:userEmail/:connectionPhone",
  async (req, res) => {
    try {

      const interactions =
          await Interaction.find({
        userEmail:
            req.params.userEmail,

        connectionPhone:
            req.params.connectionPhone,
      }).sort({
        interactionDate: -1,
      });

      res.status(200).json({
        success: true,
        interactions,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message:
            "Interaction fetch failed",
        error:
            error.message,
      });

    }
  }
);

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




router.get("/discover/search", async (req, res) => {
  try {
    const keyword = req.query.keyword || "";
    const location = req.query.location || "";
    const userEmail = req.query.userEmail || "";
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;

    const myContacts = await Connection.find({ userEmail });
    const savedPhones = myContacts.map((c) => c.connectionPhone);

    const query = {
      userEmail: { $ne: userEmail },
      connectionPhone: { $nin: savedPhones },
    };

    if (keyword) {
      query.$or = [
        { connectionName: { $regex: keyword, $options: "i" } },
        { businessName: { $regex: keyword, $options: "i" } },
        { businessCategory: { $regex: keyword, $options: "i" } },
      ];
    }

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    const results = await Connection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Connection.countDocuments(query);

    res.status(200).json({
      success: true,
      page,
      total,
      hasMore: skip + results.length < total,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
});




router.get(
  "/mutual/:userEmail/:targetEmail",
  async (req, res) => {
    try {

      const userEmail =
        req.params.userEmail;

      const targetEmail =
        req.params.targetEmail;

      const myConnections =
        await Connection.find({
          userEmail,
        });

      const targetConnections =
        await Connection.find({
          userEmail: targetEmail,
        });

      const mySet =
        myConnections.map(
          (e) => e.connectionEmail
        );

      const targetSet =
        targetConnections.map(
          (e) => e.connectionEmail
        );

      const mutual =
        mySet.filter(
          (e) => targetSet.includes(e)
        );

      res.status(200).json({
        success: true,
        count: mutual.length,
        mutual,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  }
);




router.get("/degree/:userEmail/:targetPhone", async (req, res) => {
  try {
    const { userEmail, targetPhone } = req.params;

    const direct = await Connection.findOne({
      userEmail,
      connectionPhone: targetPhone,
    });

    if (direct) {
      return res.status(200).json({
        success: true,
        degree: "1st",
        mutualCount: 0,
        mutualContacts: [],
      });
    }

    const myContacts = await Connection.find({ userEmail });
    const myPhones = myContacts.map((c) => c.connectionPhone);

    const targetContactRecords = await Connection.find({
      connectionPhone: targetPhone,
    });

    const targetOwners = targetContactRecords.map((c) => c.userEmail);

    const mutualContacts = await Connection.find({
      userEmail,
      connectionEmail: { $in: targetOwners },
    });

    if (mutualContacts.length > 0) {
      return res.status(200).json({
        success: true,
        degree: "2nd",
        mutualCount: mutualContacts.length,
        mutualContacts,
      });
    }

    const secondLevel = await Connection.find({
      userEmail: { $in: myPhones },
      connectionPhone: targetPhone,
    });

    if (secondLevel.length > 0) {
      return res.status(200).json({
        success: true,
        degree: "3rd",
        mutualCount: 0,
        mutualContacts: [],
      });
    }

    res.status(200).json({
      success: true,
      degree: "Out of Network",
      mutualCount: 0,
      mutualContacts: [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Degree check failed",
      error: error.message,
    });
  }
});




router.post("/contact/add", async (req, res) => {
  try {
    const {
      userEmail,
      connectionName,
      connectionPhone,
      connectionEmail,
      businessName,
      businessCategory,
      location,
      category,
      notes,
    } = req.body;

    if (!userEmail || !connectionName || !connectionPhone) {
      return res.status(400).json({
        success: false,
        message: "userEmail, connectionName and connectionPhone are required",
      });
    }

    const existing = await Connection.findOne({
      userEmail,
      connectionPhone,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Contact already exists",
      });
    }

    const contact = await Connection.create({
      userEmail,
      connectionName,
      connectionPhone,
      connectionEmail: connectionEmail || "",
      businessName: businessName || "",
      businessCategory: businessCategory || "",
      location: location || "",
      category: category || "Peer",
      notes: notes || "",
      tier: "1st",
      relationshipStrength: 20,
    });

    res.status(201).json({
      success: true,
      message: "Contact added successfully",
      contact,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Contact add failed",
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