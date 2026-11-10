import jwt from "jsonwebtoken";

// Creates a signed JWT. `payload` normally holds the user id and the session id.
const generateToken = (payload, expiresInSeconds) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expiresInSeconds });

export default generateToken;
