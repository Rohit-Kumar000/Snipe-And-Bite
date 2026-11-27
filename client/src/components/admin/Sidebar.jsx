import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import {
  FiGrid, FiShoppingBag, FiCoffee, FiLayers, FiPackage, FiTag, FiCalendar, FiUsers, FiImage, FiStar,
  FiSettings, FiMessageSquare, FiUserCheck, FiActivity, FiShield, FiMessageCircle, FiClock, FiCreditCard, FiBox, FiTruck, FiPercent, FiBarChart2, FiMail,
} from "react-icons/fi";
import useChatUnread from "../../hooks/useChatUnread";
import { ADMIN_NAV, ROLE_LABELS } from "../../utils/roles";
import { FAVICON_URL } from "../../utils/constants";
import Logo from "../common/Logo";
import { getSocket } from "../../services/socket";
import { FaRupeeSign } from "react-icons/fa";

const ICONS = { FiGrid, FiShoppingBag, FiCoffee, FiLayers, FiPackage, FiTag, FiCalendar, FiUsers, FiImage, FiStar, FiSettings, FiMessageSquare, FiUserCheck, FiActivity, FiShield, FiMessageCircle, FiClock, FiCreditCard, FiBox, FiTruck, FiPercent, FaRupeeSign, FiBarChart2, FiMail };

// Navigation shows only the modules the signed-in role may open, grouped by purpose.
// Collapsed: favicon and icons only, with a name tooltip on hover or keyboard focus.
export default function Sidebar({ onNavigate, collapsed = false, onToggleCollapse }) {
  const user = useSelector((state) => state.auth.user);
  const unreadChat = useChatUnread(true);
  const [tip, setTip] = useState(null);
  const [online, setOnline] = useState(false);
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const update = () => setOnline(socket.connected);
    update();
    socket.on("connect", update);
    socket.on("disconnect", update);
    socket.on("connect_error", update);
    return () => { socket.off("connect", update); socket.off("disconnect", update); socket.off("connect_error", update); };
  }, []);
  const items = ADMIN_NAV.filter((item) => item.roles.includes(user.role));
  const groups = [...new Set(items.map((item) => item.group))];

  const showTip = (label) => (event) => {
    if (!collapsed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTip({ label, top: rect.top + rect.height / 2, left: rect.right + 12 });
  };
  const hideTip = () => setTip(null);

  return (
    <aside className="admin-sidebar relative flex h-full w-full flex-col" style={{ background: "var(--surface)", color: "var(--ink)", borderRight: "1px solid var(--line)" }}>
      <div className={`shrink-0 pb-3 pt-4 ${collapsed ? "px-2" : "px-4"}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <img src={FAVICON_URL} alt="Snipe&Bite" className="h-11 w-11 rounded-xl object-contain" />
            {onToggleCollapse && <button type="button" onClick={onToggleCollapse} onMouseEnter={showTip("Expand sidebar")} onMouseLeave={hideTip} onFocus={showTip("Expand sidebar")} onBlur={hideTip} className="rounded-lg p-2 transition hover:bg-brand/10 hover:text-brand" aria-label="Expand sidebar"><FiChevronRight /></button>}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <Logo className="h-14 w-44 object-contain object-left" />
            {onToggleCollapse && <button type="button" onClick={onToggleCollapse} className="shrink-0 rounded-lg p-2 transition hover:bg-brand/10 hover:text-brand" aria-label="Collapse sidebar" title="Collapse sidebar"><FiChevronLeft /></button>}
          </div>
        )}
      </div>

      <nav className="admin-sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-2.5 pb-4" aria-label="Admin navigation">
        {groups.map((group) => (
          <div key={group}>
            {collapsed ? <div className="mx-3 mb-2 h-px" style={{ background: "var(--line)" }} /> : <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>{group}</p>}
            <div className="space-y-0.5">
              {items.filter((item) => item.group === group).map(({ to, label, icon, end }) => {
                const Icon = ICONS[icon];
                const showDot = to === "/admin/chat" && unreadChat > 0;
                return (
                  <NavLink key={to} to={to} end={end} onClick={onNavigate} aria-label={label}
                    onMouseEnter={showTip(label)} onMouseLeave={hideTip} onFocus={showTip(label)} onBlur={hideTip}
                    className={({ isActive }) => `group relative flex items-center rounded-xl text-sm font-medium transition-colors duration-150 ${collapsed ? "mx-auto h-11 w-11 justify-center" : "gap-3 px-3 py-2.5"} ${isActive ? "bg-brand/12 text-brand" : "hover:bg-brand/8"}`}
                    style={({ isActive }) => ({ color: isActive ? "var(--color-brand)" : "var(--muted-strong)", background: isActive ? "color-mix(in srgb, var(--color-brand) 13%, transparent)" : undefined })}>
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand" />}
                        <span className="relative shrink-0"><Icon size={18} className="transition duration-200 group-hover:scale-110 group-hover:text-brand" />{showDot && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-brand ring-2" style={{ "--tw-ring-color": "var(--surface)" }} aria-label="Unread messages" />}</span>
                        {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
                        {!collapsed && showDot && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{unreadChat}</span>}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`flex shrink-0 items-center justify-between gap-2 py-3 text-[11px] ${collapsed ? "justify-center px-2" : "px-4"}`} style={{ borderTop: "1px solid var(--line)", color: "var(--muted)" }}>
        {!collapsed && <span className="truncate">Snipe &amp; Bite</span>}
        <span className="inline-flex shrink-0 items-center gap-1.5" aria-label={online ? "Online" : "Offline"}>
          <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-gray-400"}`} />
          {!collapsed && <span>{ROLE_LABELS[user.role] || "Admin Panel"}</span>}
        </span>
      </div>

      {tip && collapsed && (
        <div role="tooltip" className="pointer-events-none fixed z-[9999] -translate-y-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xl" style={{ top: tip.top, left: tip.left, background: "var(--heading)", color: "var(--page)" }}>
          {tip.label}
          <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45" style={{ background: "var(--heading)" }} />
        </div>
      )}
    </aside>
  );
}
