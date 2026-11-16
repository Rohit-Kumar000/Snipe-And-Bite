import express from "express";
import { body } from "express-validator";
import {
  listTeam, listSupervisors, createMember, updateMember, changeRole, suspendMember, reactivateMember,
  resetMemberPassword, forcePasswordChange, revokeMemberSessions, memberActivity,
} from "../controllers/teamController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize, reauthenticate } from "../middleware/permissionMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();

const phoneRule = body("phone").optional({ values: "falsy" }).matches(/^[6-9]\d{9}$/).withMessage("Enter a valid 10 digit mobile number");

router.use(protect);

router.get("/", authorize("team.view"), listTeam);
router.get("/supervisors", authorize("team.create"), listSupervisors);

router.post(
  "/",
  authorize("team.create"),
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("role").isIn(["MANAGER", "ADMIN", "STAFF"]).withMessage("Choose Manager, Admin or User"),
    body("designation").optional().isLength({ max: 60 }).withMessage("Designation is too long"),
    body("reportsTo").optional({ values: "falsy" }).isMongoId().withMessage("Invalid supervisor"),
    phoneRule,
  ],
  validate,
  createMember
);

router.put(
  "/:id",
  authorize("team.manage"),
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("designation").optional().isLength({ max: 60 }).withMessage("Designation is too long"),
    body("reportsTo").optional({ values: "falsy" }).isMongoId().withMessage("Invalid supervisor"),
    phoneRule,
  ],
  validate,
  updateMember
);

router.put("/:id/role", authorize("team.changeRole"), reauthenticate, [body("role").notEmpty()], validate, changeRole);
router.put("/:id/suspend", authorize("team.manage"), suspendMember);
router.put("/:id/reactivate", authorize("team.manage"), reactivateMember);
router.post("/:id/reset-password", authorize("team.manage"), reauthenticate, resetMemberPassword);
router.post("/:id/force-password-change", authorize("team.manage"), forcePasswordChange);
router.post("/:id/revoke-sessions", authorize("team.sessions"), revokeMemberSessions);
router.get("/:id/activity", authorize("team.activity"), memberActivity);

export default router;
