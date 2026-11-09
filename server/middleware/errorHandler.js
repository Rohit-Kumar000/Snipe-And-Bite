export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || "Server error";

  // Duplicate key, for example the same email or category name
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `${field} already exists`;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }

  // Invalid ObjectId format
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  }

  // Image upload errors such as file size
  if (err.name === "MulterError") {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Image too large (max 3 MB)" : err.message;
  }

  // Malformed JSON body
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Request body contains invalid JSON";
  }

  // Unexpected server errors must not reveal internal details in production.
  if (statusCode >= 500 && process.env.NODE_ENV === "production" && !err.statusCode) message = "Server error";

  res.status(statusCode).json({
    success: false,
    message,
    code: typeof err.code === "string" ? err.code : undefined,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
