const express = require("express");

const UserProfile = require("../models/UserProfile");
const ConnectionRequest = require("../models/ConnectionRequest");
const Connection = require("../models/Connection");
const Interaction = require("../models/Interaction");
const IntroductionRequest = require("../models/IntroductionRequest");

const router = express.Router();

const normalizePhone = (value = "") => String(value).replace(/\D/g, "");
const escapeCsv = (value = "") => `"${String(value).replace(/"/g, '""')}"`;

const contactPayload = (contact, profile = null) => ({
  _id: contact._id,
  userEmail: contact.userEmail,
  connectionName: contact.connectionName || profile?.name || "",
  connectionPhone: contact.connectionPhone || profile?.phone || "",
  connectionEmail: contact.connectionEmail || profile?.email || "",
  businessName: contact.businessName || profile?.companyName || "",
  businessCategory: contact.businessCategory || profile?.industry || "",
  businessLogo:
    contact.businessLogo || profile?.businessLogo || profile?.profileImage || "",
  location: contact.location || profile?.location || "",
  googleMapLocation:
    contact.googleMapLocation || profile?.googleMapLocation || "",
  category: contact.category || "Peer",
  tier: contact.tier || "1st",
  notes: contact.notes || "",
  relationshipStrength: contact.relationshipStrength ?? 20,
  profile,
});

const profilePayload = (profile) => ({
  _id: profile._id,
  userEmail: profile.email,
  connectionName: profile.name || "",
  connectionPhone: profile.phone || "",
  connectionEmail: profile.email || "",
  businessName: profile.companyName || "",
  businessCategory: profile.industry || "",
  businessLogo: profile.businessLogo || profile.profileImage || "",
  location: profile.location || "",
  googleMapLocation: profile.googleMapLocation || "",
  category: "Peer",
  tier: "2nd",
  notes: "",
  relationshipStrength: 20,
  profile,
});

/* CREATE / UPDATE PROFILE */
router.post("/profile/create", async (req, res) => {
  try {
    const {
      email,
      name,
      phone,
      headline,
      companyName,
      businessLogo,
      role,
      industry,
      location,
      googleMapLocation,
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
        businessLogo: businessLogo || profileImage || "",
        role,
        industry,
        location,
        googleMapLocation,
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

    const toProfile = await UserProfile.findOne({ email: toEmail });

    const alreadyConnected = await Connection.findOne({
      userEmail: fromEmail,
      $or: [
        { connectionEmail: toEmail },
        ...(toProfile?.phone ? [{ connectionPhone: toProfile.phone }] : []),
      ],
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

    const fromProfile = await UserProfile.findOne({ email: request.fromEmail });
    const toProfile = await UserProfile.findOne({ email: request.toEmail });

    await Connection.findOneAndUpdate(
      {
        userEmail: request.fromEmail,
        connectionPhone: toProfile?.phone || request.toEmail,
      },
      {
        userEmail: request.fromEmail,
        connectionName: toProfile?.name || request.toEmail,
        connectionPhone: toProfile?.phone || request.toEmail,
        connectionEmail: request.toEmail,
        businessName: toProfile?.companyName || "",
        businessCategory: toProfile?.industry || "",
        businessLogo: toProfile?.businessLogo || toProfile?.profileImage || "",
        location: toProfile?.location || "",
        googleMapLocation: toProfile?.googleMapLocation || "",
        category: category || "Peer",
        tier: "1st",
        relationshipStrength: 30,
      },
      { new: true, upsert: true }
    );

    await Connection.findOneAndUpdate(
      {
        userEmail: request.toEmail,
        connectionPhone: fromProfile?.phone || request.fromEmail,
      },
      {
        userEmail: request.toEmail,
        connectionName: fromProfile?.name || request.fromEmail,
        connectionPhone: fromProfile?.phone || request.fromEmail,
        connectionEmail: request.fromEmail,
        businessName: fromProfile?.companyName || "",
        businessCategory: fromProfile?.industry || "",
        businessLogo:
          fromProfile?.businessLogo || fromProfile?.profileImage || "",
        location: fromProfile?.location || "",
        googleMapLocation: fromProfile?.googleMapLocation || "",
        category: category || "Peer",
        tier: "1st",
        relationshipStrength: 30,
      },
      { new: true, upsert: true }
    );

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

    const result = await Promise.all(
      connections.map(async (item) => {
        const profile = item.connectionEmail
          ? await UserProfile.findOne({ email: item.connectionEmail })
          : null;

        return contactPayload(item, profile);
      })
    );

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
    const { userEmail, connectionPhone, connectionEmail, category } = req.body;

    const connection = await Connection.findOneAndUpdate(
      {
        userEmail,
        $or: [
          { connectionPhone },
          ...(connectionEmail ? [{ connectionEmail }] : []),
        ],
      },
      { category },
      { new: true }
    );

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category updated",
      connection: contactPayload(connection),
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
      oldConnectionEmail,
      connectionName,
      connectionPhone,
      connectionEmail,
      businessName,
      businessCategory,
      businessLogo,
      location,
      googleMapLocation,
      category,
      notes,
    } = req.body;

    if (!userEmail || !connectionName || !connectionPhone) {
      return res.status(400).json({
        success: false,
        message: "userEmail, connectionName and connectionPhone are required",
      });
    }

    const normalizedNewPhone = normalizePhone(connectionPhone);
    const userContacts = await Connection.find({ userEmail });
    const duplicate = userContacts.find((item) => {
      const sameOldContact =
        oldConnectionPhone &&
        normalizePhone(item.connectionPhone) === normalizePhone(oldConnectionPhone);
      return (
        !sameOldContact &&
        normalizePhone(item.connectionPhone) === normalizedNewPhone
      );
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Another contact already uses this phone number",
      });
    }

    const contact = await Connection.findOneAndUpdate(
      {
        userEmail,
        $or: [
          { connectionPhone: oldConnectionPhone || connectionPhone },
          ...(oldConnectionEmail ? [{ connectionEmail: oldConnectionEmail }] : []),
        ],
      },
      {
        connectionName,
        connectionPhone,
        connectionEmail,
        businessName,
        businessCategory,
        businessLogo: businessLogo || "",
        location,
        googleMapLocation: googleMapLocation || "",
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

    if (oldConnectionPhone && oldConnectionPhone !== connectionPhone) {
      await Interaction.updateMany(
        { userEmail, connectionPhone: oldConnectionPhone },
        { connectionPhone }
      );
    }

    res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      contact: contactPayload(contact),
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
    const { userEmail, connectionPhone, connectionEmail } = req.body;

    const contact = await Connection.findOneAndDelete({
      userEmail,
      $or: [
        { connectionPhone },
        ...(connectionEmail ? [{ connectionEmail }] : []),
      ],
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    await Interaction.deleteMany({
      userEmail,
      connectionPhone: contact.connectionPhone,
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
      connectionEmail,
      notes,
    } = req.body;

    const connection =
      await Connection.findOneAndUpdate(
        {
          userEmail,
          $or: [
            { connectionPhone },
            ...(connectionEmail ? [{ connectionEmail }] : []),
          ],
        },
        {
          notes,
        },
        {
          new: true,
        }
      );

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notes updated",
      connection: contactPayload(connection),
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

      if (!userEmail || !connectionPhone || !title) {
        return res.status(400).json({
          success: false,
          message: "userEmail, connectionPhone and title are required",
        });
      }

      const connection = await Connection.findOne({
        userEmail,
        connectionPhone,
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: "Contact not found",
        });
      }

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
    const keyword = String(req.query.keyword || "").trim();
    const location = String(req.query.location || "").trim();
    const userEmail = req.query.userEmail || "";
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;

    const myContacts = await Connection.find({ userEmail });
    const savedNormalizedPhones = myContacts
      .map((c) => normalizePhone(c.connectionPhone))
      .filter(Boolean);
    const seenPhones = new Set(savedNormalizedPhones);

    const keywordRegex = keyword ? new RegExp(keyword, "i") : null;
    const locationRegex = location ? new RegExp(location, "i") : null;
    const normalizedKeyword = normalizePhone(keyword);
    const phoneSearch = normalizedKeyword.length >= 4;
    const candidates = [];

    const connectionQuery = {
      userEmail: { $ne: userEmail },
    };

    if (keywordRegex && !phoneSearch) {
      connectionQuery.$or = [
        { connectionName: { $regex: keyword, $options: "i" } },
        { connectionPhone: { $regex: keyword, $options: "i" } },
        { connectionEmail: { $regex: keyword, $options: "i" } },
        { businessName: { $regex: keyword, $options: "i" } },
        { businessCategory: { $regex: keyword, $options: "i" } },
        { location: { $regex: keyword, $options: "i" } },
      ];
    }

    if (locationRegex) {
      connectionQuery.location = { $regex: location, $options: "i" };
    }

    const profileQuery = {
      email: { $ne: userEmail },
    };

    if (keywordRegex && !phoneSearch) {
      profileQuery.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { phone: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
        { companyName: { $regex: keyword, $options: "i" } },
        { industry: { $regex: keyword, $options: "i" } },
        { location: { $regex: keyword, $options: "i" } },
      ];
    }

    if (locationRegex) {
      profileQuery.location = { $regex: location, $options: "i" };
    }

    const [profileResults, connectionResults] = await Promise.all([
      UserProfile.find(profileQuery).sort({ updatedAt: -1 }).limit(500),
      Connection.find(connectionQuery).sort({ createdAt: -1 }).limit(500),
    ]);

    profileResults.forEach((profile) => candidates.push(profilePayload(profile)));
    connectionResults.forEach((contact) => candidates.push(contactPayload(contact)));

    const results = [];

    for (const item of candidates) {
      const normalized = normalizePhone(item.connectionPhone);
      const textMatches =
        !keywordRegex ||
        keywordRegex.test(item.connectionName || "") ||
        keywordRegex.test(item.connectionPhone || "") ||
        keywordRegex.test(item.connectionEmail || "") ||
        keywordRegex.test(item.businessName || "") ||
        keywordRegex.test(item.businessCategory || "") ||
        keywordRegex.test(item.location || "") ||
        (normalizedKeyword && normalized.includes(normalizedKeyword));
      const locationMatches =
        !locationRegex || locationRegex.test(item.location || "");

      if (!textMatches || !locationMatches) continue;
      if (!normalized || seenPhones.has(normalized)) continue;

      seenPhones.add(normalized);
      results.push(item);
    }

    const pagedResults = results.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      page,
      total: results.length,
      hasMore: skip + pagedResults.length < results.length,
      results: pagedResults,
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
    const normalizedTarget = normalizePhone(targetPhone);

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
    const normalizedDirect = myContacts.some(
      (contact) => normalizePhone(contact.connectionPhone) === normalizedTarget
    );

    if (normalizedDirect) {
      return res.status(200).json({
        success: true,
        degree: "1st",
        mutualCount: 0,
        mutualContacts: [],
      });
    }

    const myPhones = myContacts.map((c) => c.connectionPhone).filter(Boolean);
    const myNormalizedPhones = myPhones.map(normalizePhone).filter(Boolean);
    const myEmails = myContacts.map((c) => c.connectionEmail).filter(Boolean);

    const targetContactRecords = await Connection.find({
      connectionPhone: targetPhone,
    });

    const targetOwners = [
      ...new Set(targetContactRecords.map((c) => c.userEmail).filter(Boolean)),
    ];

    const ownerProfiles = await UserProfile.find({ email: { $in: targetOwners } });
    const ownerPhoneSet = new Set(
      ownerProfiles.map((p) => normalizePhone(p.phone)).filter(Boolean)
    );

    const mutualContacts = myContacts.filter((contact) => {
      const emailMatch = targetOwners.includes(contact.connectionEmail);
      const phoneMatch = ownerPhoneSet.has(normalizePhone(contact.connectionPhone));
      return emailMatch || phoneMatch;
    });

    if (mutualContacts.length > 0) {
      return res.status(200).json({
        success: true,
        degree: "2nd",
        mutualCount: mutualContacts.length,
        mutualContacts: mutualContacts.map((item) => contactPayload(item)),
      });
    }

    const secondLevelOwners = await UserProfile.find({
      $or: [
        { email: { $in: myEmails } },
        { phone: { $in: myPhones } },
      ],
    });

    const secondOwnerEmails = secondLevelOwners.map((p) => p.email).filter(Boolean);
    const secondLevel = await Connection.find({
      userEmail: { $in: secondOwnerEmails },
      connectionPhone: targetPhone,
    });

    const hasThirdDegree = secondLevel.some(
      (item) => normalizePhone(item.connectionPhone) === normalizedTarget
    );

    if (hasThirdDegree) {
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
      businessLogo,
      location,
      googleMapLocation,
      category,
      notes,
    } = req.body;

    if (!userEmail || !connectionName || !connectionPhone) {
      return res.status(400).json({
        success: false,
        message: "userEmail, connectionName and connectionPhone are required",
      });
    }

    const existingByEmail = connectionEmail
      ? await Connection.findOne({ userEmail, connectionEmail })
      : null;
    const existingByPhone = (await Connection.find({ userEmail })).find(
      (item) => normalizePhone(item.connectionPhone) === normalizePhone(connectionPhone)
    );
    const existing = existingByEmail || existingByPhone;

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
      businessLogo: businessLogo || "",
      location: location || "",
      googleMapLocation: googleMapLocation || "",
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

    let csv =
      "Name,Phone,Email,Business Name,Business Category,Business Logo,Location,Google Map Location,Connection Category,Tier,Relationship Strength,Notes\n";

    connections.forEach((c) => {
      csv += [
        c.connectionName,
        c.connectionPhone,
        c.connectionEmail,
        c.businessName,
        c.businessCategory,
        c.businessLogo,
        c.location,
        c.googleMapLocation,
        c.category,
        c.tier,
        c.relationshipStrength,
        c.notes,
      ].map(escapeCsv).join(",") + "\n";
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
