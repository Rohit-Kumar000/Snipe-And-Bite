import { useEffect, useState } from "react";
import api from "../services/api";
import { getSocket } from "../services/socket";

// Total unread private messages, kept current by socket events. Drives the dot in the sidebar.
export default function useChatUnread(enabled) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const refresh = () => api.get("/chat/contacts").then(({ data }) => alive && setCount(data.totalUnread)).catch(() => {});
    refresh();
    const socket = getSocket();
    socket?.on("chat:message", refresh);
    socket?.on("chat:read", refresh);
    window.addEventListener("chat:unread-changed", refresh);
    return () => {
      alive = false;
      socket?.off("chat:message", refresh);
      socket?.off("chat:read", refresh);
      window.removeEventListener("chat:unread-changed", refresh);
    };
  }, [enabled]);
  return count;
}
