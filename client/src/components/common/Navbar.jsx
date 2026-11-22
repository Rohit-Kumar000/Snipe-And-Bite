import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiShoppingCart, FiMenu, FiX, FiUser, FiLogOut, FiPackage, FiGrid, FiChevronDown, FiCalendar, FiHeart } from "react-icons/fi";
import { logoutUser } from "../../features/auth/authSlice";
import { selectCartCount } from "../../features/cart/cartSlice";
import Logo from "./Logo";
import { isEmployee } from "../../utils/roles";
import ThemeToggle from "./ThemeToggle";
import SearchBox from "./SearchBox";
import { closeSocket } from "../../services/socket";
import Avatar from "./Avatar";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/menu", label: "Menu" },
  { to: "/offers", label: "Offers" },
  { to: "/reservation", label: "Reservation" },
  { to: "/reviews", label: "Reviews" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, initialized } = useSelector((state) => state.auth);
  const settings = useSelector((state) => state.settings.data);
  const cartCount = useSelector(selectCartCount);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (!headerRef.current?.contains(event.target)) {
        setUserOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, []);

  const handleLogout = async () => {
    closeSocket();
    await dispatch(logoutUser());
    toast.success("Logged out");
    navigate("/");
  };

  const linkClass = ({ isActive }) =>
    `relative py-1 text-sm font-medium transition hover:text-brand after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:bg-brand after:transition-all after:duration-300 ${
      isActive ? "text-brand after:w-full" : "text-choco after:w-0 hover:after:w-full"
    }`;

  const menuItem = "flex items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-black/5";

  return (
    <header ref={headerRef} className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? "glass shadow-lg" : "bg-transparent"}`} style={{ borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent" }}>
      {settings && !settings.isOpen && (
        <div className="bg-brand px-4 py-1.5 text-center text-xs font-medium text-white">
          We are currently closed and not taking new orders. You can still browse the menu.
        </div>
      )}

      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="shrink-0">
          <span className="flex h-12 w-40 items-center sm:h-14 sm:w-44">
            <Logo className="h-full w-full object-contain object-left" />
          </span>
        </Link>

        <nav className="hidden items-center gap-7 xl:flex">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>{link.label}</NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <SearchBox variant="site" />
          {!isEmployee(user) && <Link to="/wishlist" className="hidden h-10 w-10 items-center justify-center rounded-full border transition hover:border-brand hover:text-brand sm:flex" style={{ borderColor: "var(--line-strong)" }} aria-label="Wishlist"><FiHeart size={18} /></Link>}
          <Link to="/cart" className="relative flex h-10 w-10 items-center justify-center rounded-full border transition hover:border-brand hover:text-brand" style={{ borderColor: "var(--line-strong)" }} aria-label="Cart">
            <FiShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">{cartCount}</span>
            )}
          </Link>

          {user ? (
            <div className="relative hidden xl:block">
              <button type="button" onClick={() => setUserOpen((open) => !open)} className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition hover:border-brand" style={{ borderColor: "var(--line-strong)" }}>
                <Avatar user={user} size={30} />
                <span className="max-w-24 truncate text-sm font-medium">{user.name.split(" ")[0]}</span>
                <FiChevronDown size={14} />
              </button>
              {userOpen && (
                <div className="card animate-fade-up absolute right-0 mt-2 w-56 overflow-hidden py-1">
                  {isEmployee(user) && <Link to="/admin" className={menuItem}><FiGrid /> Admin panel</Link>}
                  <Link to="/profile" className={menuItem}><FiUser /> My profile</Link>
                  {!isEmployee(user) && <Link to="/wishlist" className={menuItem}><FiHeart /> Wishlist</Link>}
                  <Link to="/orders" className={menuItem}><FiPackage /> My orders</Link>
                  <Link to="/reservation" className={menuItem}><FiCalendar /> Reservations</Link>
                  <button type="button" onClick={handleLogout} className={`${menuItem} w-full text-left text-red-500`}><FiLogOut /> Logout</button>
                </div>
              )}
            </div>
          ) : initialized ? (
            <div className="hidden items-center gap-2 xl:flex">
              <Link to="/login" className="btn-ghost">Login</Link>
              <Link to="/register" className="btn-primary">Sign up</Link>
            </div>
          ) : null}

          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border xl:hidden" style={{ borderColor: "var(--line-strong)" }} onClick={() => setMobileOpen((open) => !open)} aria-label="Menu">
            {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </div>


      {mobileOpen && (
        <div className="glass animate-fade-up xl:hidden" style={{ borderTop: "1px solid var(--line)" }}>
          <nav className="container-page flex flex-col gap-1 py-3">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-brand/10 text-brand" : "text-choco"}`}>
                {link.label}
              </NavLink>
            ))}
            <div className="my-2" style={{ borderTop: "1px solid var(--line)" }} />
            {user ? (
              <>
                {isEmployee(user) && <Link to="/admin" className="rounded-xl px-3 py-2.5 text-sm">Admin panel</Link>}
                <Link to="/profile" className="rounded-xl px-3 py-2.5 text-sm">My profile</Link>
                {!isEmployee(user) && <Link to="/wishlist" className="rounded-xl px-3 py-2.5 text-sm">Wishlist</Link>}
                <Link to="/orders" className="rounded-xl px-3 py-2.5 text-sm">My orders</Link>
                <button type="button" onClick={handleLogout} className="rounded-xl px-3 py-2.5 text-left text-sm text-red-500">Logout</button>
              </>
            ) : initialized ? (
              <div className="flex gap-2 px-1">
                <Link to="/login" className="btn-outline flex-1">Login</Link>
                <Link to="/register" className="btn-primary flex-1">Sign up</Link>
              </div>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}
