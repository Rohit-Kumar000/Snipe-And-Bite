import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import api from "../../services/api";
import { timeAgo } from "../../utils/formatDate";

const POLL_MS = 30000;

// Bell with an unread dot. Notifications are real records from the server, refreshed every 30 seconds.
export default function NotificationBell() {
  const navigate = useNavigate();
  const [state, setState] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications", { params: { limit: 10 } });
      setState({ items: data.notifications, unread: data.unread });
    } catch {
      // The bell stays quiet when the server is unreachable.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const close = (event) => { if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const openItem = async (item) => {
    setOpen(false);
    if (!item.readAt) await api.patch(`/notifications/${item._id}/read`).catch(() => {});
    load();
    if (item.link) navigate(item.link);
  };

  const readAll = async () => {
    await api.patch("/notifications/read-all").catch(() => {});
    load();
  };

  return (
    <div className="relative" ref={boxRef}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full border transition hover:border-brand hover:text-brand" style={{ borderColor: "var(--line-strong)" }}>
        <FiBell size={18} />
        {state.unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white" style={{ animation: "pulse-ring 1.8s infinite" }}>
            {state.unread > 9 ? "9+" : state.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 z-50 mt-2 w-80 max-w-[88vw] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
            <p className="text-sm font-semibold text-choco">Notifications</p>
            {state.unread > 0 && <button type="button" className="text-xs font-semibold text-brand" onClick={readAll}>Mark all read</button>}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {state.items.length === 0 && <li className="px-4 py-8 text-center text-sm text-gray-500">You are all caught up.</li>}
            {state.items.map((item) => (
              <li key={item._id}>
                <button type="button" onClick={() => openItem(item)} className="flex w-full gap-3 px-4 py-3 text-left transition hover:bg-black/5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-transparent" : "bg-brand"}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-choco">{item.title}</span>
                    {item.body && <span className="block truncate text-xs text-gray-500">{item.body}</span>}
                    <span className="text-[11px] text-gray-400">{timeAgo(item.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
