import { io } from "socket.io-client";
import { getToken } from "./sessionStore";

let socket = null;

// Same host as the API, without the /api path.
const socketUrl = () => (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

// One shared connection per browser tab. The server checks the token and the live session.
export const getSocket = () => {
  if (!socket) {
    socket = io(socketUrl(), { auth: (cb) => cb({ token: getToken() }), withCredentials: true, transports: ["websocket", "polling"] });
  }
  return socket;
};

export const closeSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};
