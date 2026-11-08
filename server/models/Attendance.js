import mongoose from "mongoose";

// One record per employee per day. `date` is the day in Indian Standard Time, as YYYY-MM-DD.
const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, default: null },
    note: { type: String, maxlength: 200, default: "" },
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
