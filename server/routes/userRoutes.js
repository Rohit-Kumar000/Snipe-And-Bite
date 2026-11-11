import express from "express";
import { body } from "express-validator";
import {
  updateProfile, changePassword, addAddress, setDefaultAddress, deleteAddress, getUsers, toggleBlock,
  uploadAvatar, uploadCover, removeAvatar, removeCover, getWishlist, toggleWishlist,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import { uploadTo } from "../middleware/upload.js";
import validate from "../middleware/validate.js";
import { validatePasswordStrength } from "../utils/sessionPolicy.js";

const router = express.Router();

const avatarUpload = uploadTo("avatars", [{ width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" }]);
const coverUpload = uploadTo("covers", [{ width: 1600, height: 500, crop: "fill", quality: "auto" }]);

router.use(protect);

router.get("/wishlist", getWishlist);
router.put("/wishlist/:itemId", toggleWishlist);

router.put(
  "/profile",
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("phone")
      .optional({ values: "falsy" })
      .matches(/^[6-9]\d{9}$/)
      .withMessage("Enter a valid 10 digit mobile number"),
  ],
  validate,
  updateProfile
);

router.put("/profile/avatar", avatarUpload.single("image"), uploadAvatar);
router.delete("/profile/avatar", removeAvatar);
router.put("/profile/cover", coverUpload.single("image"), uploadCover);
router.delete("/profile/cover", removeCover);

router.put(
  "/password",
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").custom((value) => {
      const problem = validatePasswordStrength(value);
      if (problem) throw new Error(problem);
      return true;
    }),
  ],
  validate,
  changePassword
);

router.post(
  "/address",
  [
    body("line1").trim().notEmpty().withMessage("Address line is required"),
    body("city").trim().notEmpty().withMessage("City is required"),
    body("pincode").matches(/^\d{6}$/).withMessage("Pincode must be 6 digits"),
  ],
  validate,
  addAddress
);
router.put("/address/:addressId/default", setDefaultAddress);
router.delete("/address/:addressId", deleteAddress);

router.get("/", authorize("customers.view"), getUsers);
router.put("/:id/block", authorize("customers.block"), toggleBlock);

export default router;
