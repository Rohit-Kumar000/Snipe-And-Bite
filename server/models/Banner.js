import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Banner title is required"], trim: true, maxlength: 80 },
    subtitle: { type: String, trim: true, maxlength: 160, default: "" },
    image: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    link: { type: String, trim: true, default: "/menu" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Banner = mongoose.model("Banner", bannerSchema);
export default Banner;
