import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiMenu, FiExternalLink, FiLogOut, FiUser, FiSettings, FiSun, FiMoon, FiChevronDown } from "react-icons/fi";
import toast from "react-hot-toast";
import useTheme from "../../hooks/useTheme";
import { logoutUser } from "../../features/auth/authSlice";
import { getSocket, closeSocket } from "../../services/socket";
import Sidebar from "./Sidebar";
import ThemeToggle from "../common/ThemeToggle";
import NotificationBell from "../common/NotificationBell";
import Avatar from "../common/Avatar";
import SearchBox from "../common/SearchBox";
import Breadcrumbs from "./Breadcrumbs";

const COLLAPSE_KEY = "sb_admin_sidebar_collapsed";

export default function AdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
  });

  const toggleCollapsed = () => setCollapsed((value) => {
    const next = !value;
    try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* storage may be blocked */ }
    return next;
  });

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (event) => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  // One live connection for the whole panel. New assignments show as a toast.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onAssigned = ({ orderId, orderNumber }) => toast.success(`Order ${orderNumber} was assigned to you`, { id: `assigned-${orderId}` });
    socket.on("order:assigned", onAssigned);
    return () => socket.off("order:assigned", onAssigned);
  }, []);

  const signOut = async () => {
    closeSocket();
    await dispatch(logoutUser());
    navigate("/login");
  };

  const menuItem = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-brand/10";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--page)" }}>
      <div className={`z-40 sticky top-0 hidden h-screen shrink-0 overflow-visible transition-[width] duration-250 ease-out lg:block ${collapsed ? "w-18" : "w-56"}`}>
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </div>

      {open && (
        <div className="admin-drawer-backdrop fixed inset-0 z-50 flex lg:hidden">
          <div className="admin-sidebar-drawer h-full w-56 max-w-[85vw]"><Sidebar onNavigate={() => setOpen(false)} /></div>
          <button type="button" className="flex-1 bg-black/50" onClick={() => setOpen(false)} aria-label="Close menu" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-2.5" style={{ borderBottom: "1px solid var(--line)" }}>
          <button type="button" className="rounded-full p-2 hover:bg-brand/10 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}><FiMenu size={22} /></button>
          <p className="hidden text-sm font-semibold lg:block" style={{ color: "var(--muted-strong)" }}>Welcome back, <span style={{ color: "var(--heading)" }}>{user?.name?.split(" ")[0]}</span></p>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <SearchBox variant="admin" />
            <ThemeToggle />
            <NotificationBell />
            <Link to="/" title="Open website" className="hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition hover:bg-brand/10 hover:text-brand sm:flex"><FiExternalLink /> Website</Link>

            <div ref={menuRef} className="relative">
              <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu" className="flex items-center gap-1.5 rounded-full p-1 pr-2 transition hover:bg-brand/10">
                <Avatar user={user} size={34} /><FiChevronDown size={14} className={`transition ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <div role="menu" className="card animate-fade-up absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden py-1">
                  <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
                    <Avatar user={user} size={40} />
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="truncate text-xs" style={{ color: "var(--muted)" }}>{user?.email}</p></div>
                  </div>
                  <Link role="menuitem" to="/admin/profile" className={menuItem}><FiUser /> My Profile</Link>
                  <Link role="menuitem" to="/admin/security" className={menuItem}><FiSettings /> Settings</Link>
                  <button role="menuitem" type="button" className={menuItem} onClick={toggleTheme}>
                    {isLight ? <FiMoon /> : <FiSun />} {isLight ? "Dark Mode" : "Light Mode"}
                  </button>
                  <button role="menuitem" type="button" className={`${menuItem} text-red-500`} style={{ borderTop: "1px solid var(--line)" }} onClick={signOut}><FiLogOut /> Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6"><Breadcrumbs /><Outlet /></main>

        <footer className="px-4 py-4 text-xs sm:px-6" style={{ borderTop: "1px solid var(--line)", color: "var(--muted)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>&copy; {new Date().getFullYear()} Snipe &amp; Bite</p>
            <nav className="flex gap-4" aria-label="Admin footer"><Link to="/" className="hover:text-brand">Website</Link><Link to="/admin/security" className="hover:text-brand">Security</Link><Link to="/admin/profile" className="hover:text-brand">My Profile</Link></nav>
          </div>
        </footer>
      </div>
    </div>
  );
}