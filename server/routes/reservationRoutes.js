import express from "express";
import { body } from "express-validator";
import {
  createReservation, getMyReservations, cancelReservation,
  getAllReservations, updateReservationStatus,
} from "../controllers/reservationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();

router.use(protect);

router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("phone").matches(/^[6-9]\d{9}$/).withMessage("Enter a valid 10 digit mobile number"),
    body("date").matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("Date must be in YYYY-MM-DD format"),
    body("time").matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage("Time must be in HH:MM format"),
    body("guests").isInt({ min: 1, max: 20 }).withMessage("Guests must be between 1 and 20"),
  ],
  validate,
  createReservation
);

router.get("/my", getMyReservations);
router.put("/:id/cancel", cancelReservation);

router.get("/", authorize("reservations.manage"), getAllReservations);
router.put(
  "/:id",
  authorize("reservations.manage"),
  [body("status").isIn(["pending", "confirmed", "cancelled", "completed"]).withMessage("Invalid status")],
  validate,
  updateReservationStatus
);

export default router;
