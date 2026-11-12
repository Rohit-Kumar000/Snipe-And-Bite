import express from "express";
import { body } from "express-validator";
import {
  getCombos, getCombo, createCombo, updateCombo, deleteCombo,
} from "../controllers/comboController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import { uploadTo } from "../middleware/upload.js";
import validate from "../middleware/validate.js";

const router = express.Router();
const upload = uploadTo("combos");

const createRules = [
  body("name").trim().notEmpty().withMessage("Combo name is required"),
  body("price").isFloat({ min: 1 }).withMessage("Price must be a number (minimum 1)"),
  body("items").notEmpty().withMessage("Combo items are required"),
];

const updateRules = [
  body("name").optional().trim().notEmpty().withMessage("Combo name cannot be empty"),
  body("price").optional().isFloat({ min: 1 }).withMessage("Price must be a number (minimum 1)"),
];

router.get("/", getCombos);
router.get("/:id", getCombo);

router.post("/", protect, authorize("menu.manage"), upload.single("image"), createRules, validate, createCombo);
router.put("/:id", protect, authorize("menu.manage"), upload.single("image"), updateRules, validate, updateCombo);
router.delete("/:id", protect, authorize("menu.manage"), deleteCombo);

export default router;
