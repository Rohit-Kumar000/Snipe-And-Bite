import express from "express";
import { body } from "express-validator";
import {
  getMenuItems, getDeals, getMenuItem, createMenuItem,
  updateMenuItem, toggleAvailability, deleteMenuItem, addGalleryImage, removeGalleryImage,
} from "../controllers/menuController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import { uploadTo } from "../middleware/upload.js";
import validate from "../middleware/validate.js";

const router = express.Router();
const upload = uploadTo("menu");

const createRules = [
  body("name").trim().notEmpty().withMessage("Item name is required"),
  body("price").isFloat({ min: 1 }).withMessage("Price must be a number (minimum 1)"),
  body("category").isMongoId().withMessage("A valid category is required"),
];

const updateRules = [
  body("name").optional().trim().notEmpty().withMessage("Item name cannot be empty"),
  body("price").optional().isFloat({ min: 1 }).withMessage("Price must be a number (minimum 1)"),
  body("category").optional().isMongoId().withMessage("A valid category is required"),
];

router.get("/", getMenuItems);
router.get("/deals", getDeals); // must stay above /:id
router.get("/:id", getMenuItem);

router.post("/", protect, authorize("menu.manage"), upload.single("image"), createRules, validate, createMenuItem);
router.put("/:id", protect, authorize("menu.manage"), upload.single("image"), updateRules, validate, updateMenuItem);
router.post("/:id/gallery", protect, authorize("menu.manage"), upload.single("image"), addGalleryImage);
router.delete("/:id/gallery/:index", protect, authorize("menu.manage"), removeGalleryImage);
router.patch("/:id/availability", protect, authorize("menu.availability"), toggleAvailability);
router.delete("/:id", protect, authorize("menu.manage"), deleteMenuItem);

export default router;
