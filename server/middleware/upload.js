import multer from "multer";
import cloudinary from "../config/cloudinary.js";

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  const err = new Error("Only JPG, PNG or WEBP images are allowed");
  err.statusCode = 400;
  cb(err);
};

// Usage: uploadTo("menu").single("image")
// `transformation` can override the default resize, for example a square crop for avatars.
export const uploadTo = (folder, transformation = [{ width: 1400, height: 1400, crop: "limit", quality: "auto" }]) =>
  multer({
    storage: {
      _handleFile(req, file, callback) {
        let completed = false;
        const finish = (error, result) => {
          if (completed) return;
          completed = true;
          if (error) return callback(error);
          callback(null, { path: result.secure_url, filename: result.public_id, size: result.bytes });
        };
        const upload = cloudinary.uploader.upload_stream({
          folder: `snipe-and-bite/${folder}`,
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          transformation,
          resource_type: "image",
        }, finish);
        file.stream.on("error", (error) => finish(error));
        file.stream.pipe(upload);
      },
      _removeFile(req, file, callback) {
        if (!file.filename) return callback(null);
        cloudinary.uploader.destroy(file.filename).then(() => callback(null)).catch(callback);
      },
    },
    limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
    fileFilter,
  });
