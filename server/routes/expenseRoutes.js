import express from "express";
import { body, param } from "express-validator";
import { listExpenses, createExpense, updateExpense, deleteExpense } from "../controllers/expenseController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import validate from "../middleware/validate.js";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../models/Expense.js";

const router = express.Router();
router.use(protect, authorize("expenses.manage"));

const rules = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 100 }),
  body("category").isIn(EXPENSE_CATEGORIES).withMessage("Choose a category"),
  body("amount").isFloat({ min: 0.01 }).withMessage("Enter an amount more than zero"),
  body("date").isISO8601().withMessage("Enter a valid date"),
  body("paymentMethod").optional().isIn(PAYMENT_METHODS).withMessage("Choose a payment method"),
];

router.get("/", listExpenses);
router.post("/", rules, validate, createExpense);
router.put("/:id", [param("id").isMongoId()], validate, updateExpense);
router.delete("/:id", [param("id").isMongoId()], validate, deleteExpense);

export default router;
