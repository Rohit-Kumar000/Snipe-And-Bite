import express from "express";
import { body } from "express-validator";
import {
  getBanners, getAllBanners, createBanner, updateBanner, deleteBanner,
} from "../controllers/bannerController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import { uploadTo } from "../middleware/upload.js";
import validate from "../middleware/validate.js";

const router = express.Router();
// Wide images are kept sharp on large screens; anything bigger than 1920 px is scaled down.
const upload = uploadTo("banners", [{ width: 1920, height: 1080, crop: "limit", quality: "auto" }]);

router.get("/", getBanners);
router.get("/all", protect, authorize("menu.manage"), getAllBanners);

router.post(
  "/",
  protect, authorize("menu.manage"), upload.single("image"),
  [body("title").trim().notEmpty().withMessage("Banner title is required")],
  validate,
  createBanner
);
router.put(
  "/:id",
  protect, authorize("menu.manage"), upload.single("image"),
  [body("title").optional().trim().notEmpty().withMessage("Banner title cannot be empty")],
  validate,
  updateBanner
);
router.delete("/:id", protect, authorize("menu.manage"), deleteBanner);

export default router;
