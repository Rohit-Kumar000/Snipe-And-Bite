import express from "express";
import { body } from "express-validator";
import { addReview, getItemReviews, getAllReviews, deleteReview, getPublicReviews, getReviewSummary } from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();

router.get("/public", getPublicReviews);
router.get("/summary", getReviewSummary);
router.get("/item/:id", getItemReviews);

router.post(
  "/",
  protect,
  [
    body("menuItem").isMongoId().withMessage("A valid menu item is required"),
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    body("comment").optional().isLength({ max: 500 }).withMessage("Comment can be up to 500 characters"),
  ],
  validate,
  addReview
);

router.get("/", protect, authorize("reviews.moderate"), getAllReviews);
router.delete("/:id", protect, authorize("reviews.moderate"), deleteReview);

export default router;
