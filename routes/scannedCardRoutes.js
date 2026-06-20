const express = require("express");
const router = express.Router();

const ScannedCard = require("../models/ScannedCard");

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function cleanText(value) {
  return String(value || "").trim();
}

router.post("/check-duplicate", async (req, res) => {
  try {
    const { userEmail, phone, email } = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "userEmail is required",
      });
    }

    const normalizedUserEmail = String(userEmail).trim().toLowerCase();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);

    const conditions = [];

    if (normalizedEmail) {
      conditions.push({ email: normalizedEmail });
    }

    if (normalizedPhone) {
      conditions.push({
        phone: { $regex: normalizedPhone.slice(-10) },
      });
    }

    if (conditions.length === 0) {
      return res.json({
        success: true,
        duplicate: false,
        contact: null,
      });
    }

    const existing = await ScannedCard.findOne({
      userEmail: normalizedUserEmail,
      $or: conditions,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      duplicate: !!existing,
      contact: existing,
    });
  } catch (error) {
    console.error("Check duplicate error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check duplicate",
      error: error.message,
    });
  }
});

router.post("/create", async (req, res) => {
  try {
    const {
      userEmail,
      name,
      jobTitle,
      company,
      phone,
      email,
      website,
      address,
      rawText,
      cardImageUrl,
      localImagePath,
    } = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "userEmail is required",
      });
    }

    if (!name && !phone && !email) {
      return res.status(400).json({
        success: false,
        message: "At least name, phone or email is required",
      });
    }

    const created = await ScannedCard.create({
      userEmail: cleanText(userEmail).toLowerCase(),
      name: cleanText(name),
      jobTitle: cleanText(jobTitle),
      company: cleanText(company),
      phone: cleanText(phone),
      email: cleanText(email).toLowerCase(),
      website: cleanText(website),
      address: cleanText(address),
      rawText: cleanText(rawText),
      cardImageUrl: cleanText(cardImageUrl),
      localImagePath: cleanText(localImagePath),
    });

    return res.status(201).json({
      success: true,
      message: "Scanned card saved successfully",
      contact: created,
    });
  } catch (error) {
    console.error("Create scanned card error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save scanned card",
      error: error.message,
    });
  }
});

router.get("/user/:email", async (req, res) => {
  try {
    const userEmail = String(req.params.email || "").trim().toLowerCase();

    const contacts = await ScannedCard.find({ userEmail }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      contacts,
    });
  } catch (error) {
    console.error("Get scanned cards error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch scanned cards",
      error: error.message,
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const updated = await ScannedCard.findByIdAndUpdate(
      req.params.id,
      {
        name: cleanText(req.body.name),
        jobTitle: cleanText(req.body.jobTitle),
        company: cleanText(req.body.company),
        phone: cleanText(req.body.phone),
        email: cleanText(req.body.email).toLowerCase(),
        website: cleanText(req.body.website),
        address: cleanText(req.body.address),
        rawText: cleanText(req.body.rawText),
        cardImageUrl: cleanText(req.body.cardImageUrl),
        localImagePath: cleanText(req.body.localImagePath),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Scanned card not found",
      });
    }

    return res.json({
      success: true,
      message: "Scanned card updated successfully",
      contact: updated,
    });
  } catch (error) {
    console.error("Update scanned card error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update scanned card",
      error: error.message,
    });
  }
});

module.exports = router;