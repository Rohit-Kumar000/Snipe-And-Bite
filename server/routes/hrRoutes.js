import express from "express";
import { body, param } from "express-validator";
import {
  checkIn, checkOut, myAttendance, teamAttendance, requestLeave, myLeaves, teamLeaves, decideLeave,
  listStructures, saveStructure, generatePayroll, listPayroll, adjustPayroll, payPayroll, myPayslips,
} from "../controllers/hrController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();
router.use(protect);

const day = (field) => body(field).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage(`${field} must be a date`);

// Attendance and leave: everyone for themselves, team views for managers and above.
router.post("/attendance/check-in", authorize("attendance.self"), checkIn);
router.post("/attendance/check-out", authorize("attendance.self"), checkOut);
router.get("/attendance/me", authorize("attendance.self"), myAttendance);
router.get("/attendance/team", authorize("attendance.viewTeam"), teamAttendance);

router.post("/leaves", authorize("attendance.self"), [day("from"), day("to"), body("type").optional().isIn(["paid", "unpaid", "sick"])], validate, requestLeave);
router.get("/leaves/me", authorize("attendance.self"), myLeaves);
router.get("/leaves", authorize("attendance.viewTeam"), teamLeaves);
router.put("/leaves/:id/decision", authorize("attendance.viewTeam"), [param("id").isMongoId(), body("decision").isIn(["approve", "reject"])], validate, decideLeave);

// Salaries and payroll: Super Admin only. Employees may read their own paid payslips.
router.get("/payroll/me", authorize("payroll.viewOwn"), myPayslips);
router.get("/payroll/structures", authorize("payroll.manage"), listStructures);
router.put("/payroll/structures/:userId", authorize("payroll.manage"), [param("userId").isMongoId(), body("monthlyBase").isFloat({ min: 0 }).withMessage("Enter the monthly salary")], validate, saveStructure);
router.post("/payroll/generate", authorize("payroll.manage"), generatePayroll);
router.get("/payroll", authorize("payroll.manage"), listPayroll);
router.put("/payroll/:id", authorize("payroll.manage"), [param("id").isMongoId()], validate, adjustPayroll);
router.put("/payroll/:id/pay", authorize("payroll.manage"), [param("id").isMongoId()], validate, payPayroll);

export default router;
