// Converts text into a URL friendly slug.
export const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Multipart form fields always arrive as strings, so "true" / "false" must be converted.
export const toBool = (value, fallback) => {
  if (value === undefined || value === "") return fallback;
  return value === true || value === "true" || value === "1";
};

// Escapes user input before it is used inside a regular expression.
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Builds an Error that carries an HTTP status code.
export const httpError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// Arrays and objects arrive as JSON strings in multipart forms.
export const parseJSON = (value, fieldName) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw httpError(`${fieldName} must be valid JSON`);
  }
};

// Rounds a money value to two decimals.
export const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

// Parses pagination query values with safe limits.
export const getPagination = (query, defaultLimit = 12, maxLimit = 100) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

// Start of the current day in Indian Standard Time, returned as a UTC Date.
export const startOfTodayIST = () => {
  const offset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(Date.now() + offset);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - offset);
};
