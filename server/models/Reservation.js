import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: [true, "Name is required"], trim: true, maxlength: 50 },
    phone: { type: String, required: [true, "Phone is required"], trim: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:MM (24 hour)
    dateTime: { type: Date, required: true }, // the same moment as a real Date, used for sorting
    guests: { type: Number, required: true, min: 1, max: 20 },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

reservationSchema.index({ dateTime: 1 });
reservationSchema.index({ user: 1, dateTime: -1 });

const Reservation = mongoose.model("Reservation", reservationSchema);
export default Reservation;
