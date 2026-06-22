const express = require("express");
const router = express.Router();

const ScannedCard = require("../models/ScannedCard");
const Connection = require("../models/Connection");
const Interaction = require("../models/Interaction");

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function cleanText(value) {
  return String(value || "").trim();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findNetworkDuplicate({ userEmail, phone, email }) {
  const contacts = await Connection.find({
    userEmail: {
      $regex: `^${escapeRegex(userEmail)}$`,
      $options: "i",
    },
  });
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = cleanText(email).toLowerCase();

  return (
    contacts.find((contact) => {
      const contactPhone = normalizePhone(contact.connectionPhone);
      const phoneMatches =
        normalizedPhone &&
        contactPhone &&
        (contactPhone === normalizedPhone ||
          (contactPhone.length >= 10 &&
            normalizedPhone.length >= 10 &&
            contactPhone.slice(-10) === normalizedPhone.slice(-10)));
      const emailMatches =
        normalizedEmail &&
        cleanText(contact.connectionEmail).toLowerCase() === normalizedEmail;
      return phoneMatches || emailMatches;
    }) || null
  );
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

    if (!normalizedEmail && !normalizedPhone) {
      return res.json({
        success: true,
        duplicate: false,
        contact: null,
      });
    }

    const existing = await findNetworkDuplicate({
      userEmail: normalizedUserEmail,
      phone,
      email,
    });

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

router.post("/save-to-network", async (req, res) => {
  let savedCard = null;
  let connection = null;
  let interaction = null;

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

    const ownerEmail = cleanText(userEmail);
    const normalizedUserEmail = ownerEmail.toLowerCase();
    const normalizedEmail = cleanText(email).toLowerCase();
    const cleanedPhone = cleanText(phone);
    const duplicate = await findNetworkDuplicate({
      userEmail: ownerEmail,
      phone: cleanedPhone,
      email: normalizedEmail,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: "This contact already exists in your Network",
        contact: duplicate,
      });
    }

    savedCard = await ScannedCard.create({
      userEmail: normalizedUserEmail,
      name: cleanText(name),
      jobTitle: cleanText(jobTitle),
      company: cleanText(company),
      phone: cleanedPhone,
      email: normalizedEmail,
      website: cleanText(website),
      address: cleanText(address),
      rawText: cleanText(rawText),
      cardImageUrl: cleanText(cardImageUrl),
      localImagePath: cleanText(localImagePath),
      source: "business_card_ocr",
      savedToNetwork: true,
    });

    const interactionKey =
      cleanedPhone ||
      (normalizedEmail ? `email:${normalizedEmail}` : `card:${savedCard._id}`);

    connection = await Connection.create({
      userEmail: ownerEmail,
      connectionName: cleanText(name) || cleanedPhone || normalizedEmail,
      connectionPhone: cleanedPhone,
      connectionEmail: normalizedEmail,
      interactionKey,
      businessName: cleanText(company),
      businessCategory: cleanText(jobTitle),
      location: cleanText(address),
      category: "Peer",
      tier: "1st",
      relationshipStrength: 0,
      source: "business_card_ocr",
      contactType: "external_card_contact",
      jobTitle: cleanText(jobTitle),
      website: cleanText(website),
      rawText: cleanText(rawText),
      cardImageUrl: cleanText(cardImageUrl),
      localImagePath: cleanText(localImagePath),
      scannedCardId: savedCard._id,
    });

    interaction = await Interaction.create({
      userEmail: ownerEmail,
      connectionPhone: interactionKey,
      type: "Note",
      title: "Contact added from scanned business card",
      description: "Created by Business Card OCR",
    });

    return res.status(201).json({
      success: true,
      message: "Scanned contact saved to network successfully",
      contact: connection,
      scannedCard: savedCard,
      interaction,
    });
  } catch (error) {
    console.error("Save scanned contact to network error:", error);

    if (interaction?._id) {
      await Interaction.findByIdAndDelete(interaction._id).catch(() => {});
    }
    if (connection?._id) {
      await Connection.findByIdAndDelete(connection._id).catch(() => {});
    }
    if (savedCard?._id) {
      await ScannedCard.findByIdAndDelete(savedCard._id).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: "Failed to save scanned contact to network",
      error: error.message,
    });
  }
});



module.exports = router;
