// Shared Socket.IO state. Kept apart from socket/index.js so services can emit without circular imports.
let io = null;
export const online = new Map(); // userId -> number of open sockets

export const setIO = (instance) => { io = instance; };
export const getIO = () => io;
export const isOnline = (userId) => online.has(String(userId));

// Sends an event to every open tab of one user. Does nothing when sockets are not running (for example in tests).
export const emitToUser = (userId, event, payload) => {
  if (io && userId) io.to(`user:${userId}`).emit(event, payload);
};
