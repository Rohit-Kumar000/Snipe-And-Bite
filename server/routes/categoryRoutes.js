import express from "express";
import { body } from "express-validator";
import {
  getCategories, getAllCategories, createCategory, updateCategory, deleteCategory,
} from "../controllers/categoryController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import { uploadTo } from "../middleware/upload.js";
import validate from "../middleware/validate.js";

const router = express.Router();
const upload = uploadTo("categories");

router.get("/", getCategories);
router.get("/all", protect, authorize("menu.manage"), getAllCategories);

router.post(
  "/",
  protect, authorize("menu.manage"), upload.single("image"),
  [body("name").trim().notEmpty().withMessage("Category name is required")],
  validate,
  createCategory
);

router.put(
  "/:id",
  protect, authorize("menu.manage"), upload.single("image"),
  [body("name").optional().trim().notEmpty().withMessage("Category name cannot be empty")],
  validate,
  updateCategory
);

router.delete("/:id", protect, authorize("menu.manage"), deleteCategory);

export default router;
