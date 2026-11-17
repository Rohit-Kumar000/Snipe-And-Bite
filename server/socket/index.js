import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { isSessionExpired, idleTimeoutMs } from "../utils/sessionPolicy.js";
import { isEmployeeRole } from "../utils/permissions.js";
import { sendMessage, markConversationRead, contactIdsFor } from "../services/chatService.js";
import { online, setIO, getIO } from "./io.js";

const readCookie = (header = "", name) => {
  const part = header.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : "";
};

// Authenticates a socket the same way the REST middleware does: valid JWT, live session, active user.
const authenticate = async (socket) => {
  const token = socket.handshake.auth?.token || readCookie(socket.handshake.headers?.cookie, "token");
  if (!token) throw new Error("Not authorized");
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new Error("Session expired");
  }
  if (decoded.purpose || !decoded.sid) throw new Error("Session expired");
  const [session, user] = await Promise.all([Session.findById(decoded.sid), User.findById(decoded.id)]);
  if (isSessionExpired(session, Date.now(), idleTimeoutMs())) throw new Error("Session expired");
  if (!user || String(session.user) !== String(user._id)) throw new Error("User no longer exists");
  if (user.isBlocked || user.mustChangePassword) throw new Error("Account not allowed");
  return user;
};

export const initSocket = (httpServer, allowedOrigins) => {
  const io = new Server(httpServer, { cors: { origin: allowedOrigins, credentials: true } });
  setIO(io);

  io.use(async (socket, next) => {
    try {
      socket.data.user = await authenticate(socket);
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    const id = String(user._id);
    socket.join(`user:${id}`);
    online.set(id, (online.get(id) || 0) + 1);
    if (isEmployeeRole(user.role)) {
      socket.join("employees");
      io.to("employees").emit("presence:update", { userId: id, online: true });
    }

    // Allowed contacts are cached briefly so typing events do not hit the database every time.
    let allowed = { at: 0, ids: new Set() };
    const canReach = async (otherId) => {
      if (Date.now() - allowed.at > 60_000) allowed = { at: Date.now(), ids: new Set(await contactIdsFor(user)) };
      return allowed.ids.has(String(otherId));
    };

    socket.on("chat:send", async (payload, ack) => {
      try {
        const message = await sendMessage(user, payload?.to, payload?.text);
        ack?.({ ok: true, message });
      } catch (error) {
        ack?.({ ok: false, message: error.message });
      }
    });

    socket.on("chat:typing", async (payload) => {
      if (payload?.to && (await canReach(payload.to))) {
        io.to(`user:${payload.to}`).emit("chat:typing", { from: id, typing: Boolean(payload.typing) });
      }
    });

    socket.on("chat:read", async (payload, ack) => {
      try {
        const count = await markConversationRead(user, payload?.with);
        ack?.({ ok: true, count });
      } catch (error) {
        ack?.({ ok: false, message: error.message });
      }
    });

    socket.on("disconnect", async () => {
      const left = (online.get(id) || 1) - 1;
      if (left > 0) return online.set(id, left);
      online.delete(id);
      const lastSeenAt = new Date();
      await User.updateOne({ _id: user._id }, { lastSeenAt }).catch(() => {});
      if (isEmployeeRole(user.role)) getIO()?.to("employees").emit("presence:update", { userId: id, online: false, lastSeenAt });
      return undefined;
    });
  });

  return io;
};

export { emitToUser, isOnline } from "./io.js";
