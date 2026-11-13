import Reservation from "../models/Reservation.js";
import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError, getPagination } from "../utils/helpers.js";

const MAX_DAYS_AHEAD = 60;

// POST /api/reservations
export const createReservation = asyncHandler(async (req, res) => {
  const { name, phone, date, time, guests, note } = req.body;

  // The date and time are entered in Indian Standard Time.
  const dateTime = new Date(`${date}T${time}:00+05:30`);
  if (Number.isNaN(dateTime.getTime())) throw httpError("Invalid date or time");
  if (dateTime.getTime() < Date.now() + 30 * 60 * 1000) {
    throw httpError("Please choose a time at least 30 minutes from now");
  }
  if (dateTime.getTime() > Date.now() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
    throw httpError(`Reservations can be made up to ${MAX_DAYS_AHEAD} days ahead`);
  }

  // Check the requested time against opening hours (skipped for overnight timings).
  const settings = await Settings.getSettings();
  if (settings.openTime < settings.closeTime && (time < settings.openTime || time > settings.closeTime)) {
    throw httpError(`We are open from ${settings.openTime} to ${settings.closeTime}`);
  }

  const reservation = await Reservation.create({
    user: req.user._id,
    name,
    phone,
    date,
    time,
    dateTime,
    guests: Number(guests),
    note,
  });
  res.status(201).json({ success: true, reservation });
});

// GET /api/reservations/my
export const getMyReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find({ user: req.user._id }).sort({ dateTime: -1 });
  res.json({ success: true, reservations });
});

// PUT /api/reservations/:id/cancel (owner)
export const cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findOne({ _id: req.params.id, user: req.user._id });
  if (!reservation) throw httpError("Reservation not found", 404);
  if (!["pending", "confirmed"].includes(reservation.status)) {
    throw httpError("This reservation can no longer be cancelled");
  }
  reservation.status = "cancelled";
  await reservation.save();
  res.json({ success: true, reservation });
});

// GET /api/reservations (admin)
export const getAllReservations = asyncHandler(async (req, res) => {
  const { status, date } = req.query;
  const { page, limit, skip } = getPagination(req.query, 15, 50);

  const filter = {};
  if (status) filter.status = status;
  if (date) filter.date = date;

  const [reservations, total] = await Promise.all([
    Reservation.find(filter).populate("user", "name email").sort({ dateTime: 1 }).skip(skip).limit(limit),
    Reservation.countDocuments(filter),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), reservations });
});

// PUT /api/reservations/:id (admin, changes the status)
export const updateReservationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw httpError("Reservation not found", 404);
  reservation.status = status;
  await reservation.save();
  res.json({ success: true, reservation });
});
