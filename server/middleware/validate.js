import { validationResult } from "express-validator";
import { deleteImage } from "../config/cloudinary.js";

// Returns the first validation error. An already uploaded image is removed from Cloudinary.
const validate = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) await deleteImage(req.file.filename);
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

export default validate;
