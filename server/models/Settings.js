import mongoose from "mongoose";

// A single document that stores the restaurant configuration.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    restaurantName: { type: String, default: "Snipe&Bite", trim: true },
    tagline: { type: String, default: "Snipe the craving. Take a Bite.", trim: true },
    phone: { type: String, default: "", trim: true },
    whatsappNumber: { type: String, default: "", trim: true }, // digits with country code, e.g. 919876543210
    email: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    socialLinks: {
      facebook: { type: String, default: "", trim: true },
      instagram: { type: String, default: "", trim: true },
      linkedin: { type: String, default: "", trim: true },
    },
    gstNumber: { type: String, default: "", trim: true },
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: "10:00" },
    closeTime: { type: String, default: "23:00" },
    deliveryCharge: { type: Number, default: 40, min: 0 },
    freeDeliveryAbove: { type: Number, default: 500, min: 0 }, // 0 disables free delivery
    taxPercent: { type: Number, default: 5, min: 0, max: 100 },
    minOrderAmount: { type: Number, default: 100, min: 0 },
    loyaltyPercent: { type: Number, default: 5, min: 0, max: 100 },
    servicePincodes: { type: [String], default: [] }, // empty means every pincode is served
  },
  { timestamps: true }
);

// Returns the settings document, creating it with defaults on first use.
settingsSchema.statics.getSettings = async function () {
  const options = { upsert: true, returnDocument: "after", setDefaultsOnInsert: true };
  try {
    return await this.findOneAndUpdate({ key: "main" }, { $setOnInsert: { restaurantName: "Snipe&Bite" } }, options);
  } catch (error) {
    // Two requests can race to create the first document. The loser simply reads it.
    if (error.code === 11000) return this.findOne({ key: "main" });
    throw error;
  }
};

const Settings = mongoose.model("Settings", settingsSchema);
export default Settings;
