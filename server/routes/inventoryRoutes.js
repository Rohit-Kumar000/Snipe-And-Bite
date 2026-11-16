import express from "express";
import { body, param } from "express-validator";
import {
  listStock, lowStockAlerts, createStock, updateStock, adjustStock, listMovements,
  listSuppliers, createSupplier, updateSupplier, deleteSupplier, listProductCosting, updateProductCosting,
} from "../controllers/inventoryController.js";
import { listPurchases, getPurchase, createPurchase, updatePurchase, setPurchaseStatus, receivePurchase, markPurchasePaid } from "../controllers/purchaseController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import validate from "../middleware/validate.js";
import { STOCK_UNITS } from "../models/StockItem.js";

const router = express.Router();
router.use(protect);

const idParam = param("id").isMongoId().withMessage("Invalid id");
const nonNeg = (field) => body(field).optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage(`${field} must be zero or more`);

// Stock
router.get("/stock", authorize("inventory.view"), listStock);
router.get("/stock/alerts", authorize("inventory.view"), lowStockAlerts);
router.get("/movements", authorize("inventory.view"), listMovements);
router.post("/stock", authorize("inventory.manage"), [body("name").trim().notEmpty().withMessage("Name is required"), body("unit").optional().isIn(STOCK_UNITS), nonNeg("reorderLevel"), nonNeg("unitCost"), nonNeg("openingQuantity")], validate, createStock);
router.put("/stock/:id", authorize("inventory.manage"), [idParam], validate, updateStock);
router.post("/stock/:id/adjust", authorize("inventory.manage"), [idParam, body("mode").isIn(["add", "remove", "set"]), body("quantity").isFloat({ min: 0 }).withMessage("Enter a valid quantity"), body("reason").trim().notEmpty().withMessage("A reason is required").isLength({ max: 200 })], validate, adjustStock);

// Suppliers
router.get("/suppliers", authorize("suppliers.manage", "inventory.view"), listSuppliers);
router.post("/suppliers", authorize("suppliers.manage"), [body("name").trim().notEmpty().withMessage("Supplier name is required"), body("email").optional({ values: "falsy" }).isEmail().withMessage("Enter a valid email"), body("phone").optional({ values: "falsy" }).matches(/^[0-9+\-\s]{7,20}$/).withMessage("Enter a valid phone")], validate, createSupplier);
router.put("/suppliers/:id", authorize("suppliers.manage"), [idParam, body("email").optional({ values: "falsy" }).isEmail().withMessage("Enter a valid email")], validate, updateSupplier);
router.delete("/suppliers/:id", authorize("suppliers.manage"), [idParam], validate, deleteSupplier);

// Purchase orders
router.get("/purchases", authorize("purchases.manage"), listPurchases);
router.get("/purchases/:id", authorize("purchases.manage"), [idParam], validate, getPurchase);
router.post("/purchases", authorize("purchases.manage"), [body("supplier").isMongoId().withMessage("Choose a supplier")], validate, createPurchase);
router.put("/purchases/:id", authorize("purchases.manage"), [idParam], validate, updatePurchase);
router.put("/purchases/:id/status", authorize("purchases.manage"), [idParam, body("status").isIn(["ordered", "cancelled"])], validate, setPurchaseStatus);
router.post("/purchases/:id/receive", authorize("purchases.manage"), [idParam], validate, receivePurchase);
router.put("/purchases/:id/pay", authorize("purchases.manage"), [idParam], validate, markPurchasePaid);

// Product costing
router.get("/costing", authorize("costing.view"), listProductCosting);
router.put("/costing/:id", authorize("inventory.manage"), [idParam], validate, updateProductCosting);

export default router;
