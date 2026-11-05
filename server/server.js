import "dotenv/config";
import http from "http";
import connectDB from "./config/db.js";
import app, { allowedOrigins } from "./app.js";
import { initSocket } from "./socket/index.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be set to a random string of at least 32 characters.");
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  // Socket.IO shares the same HTTP server and port as the REST API.
  const server = http.createServer(app);
  initSocket(server, allowedOrigins);
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
