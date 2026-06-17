const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, default: "" },

    headline: { type: String, default: "" },
    companyName: { type: String, default: "" },
    businessLogo: { type: String, default: "" },
    role: { type: String, default: "" },
    industry: { type: String, default: "" },
    location: { type: String, default: "" },
    googleMapLocation: { type: String, default: "" },

    bio: { type: String, default: "" },
    skills: [{ type: String }],
    interests: [{ type: String }],

    profileImage: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserProfile", userProfileSchema);
