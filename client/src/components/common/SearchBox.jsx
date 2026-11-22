import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiSearch, FiX, FiArrowRight } from "react-icons/fi";
import api from "../../services/api";
import useDebounce from "../../hooks/useDebounce";
import { formatPrice } from "../../utils/formatPrice";
import { ADMIN_NAV } from "../../utils/roles";
import FoodImage from "./FoodImage";

// One search for the whole app. variant="site" searches dishes and categories.
// variant="admin" searches admin pages, products and orders, limited to what the role may open.
// It opens as a small panel under the header, closes on outside click or Escape, and has no modal backdrop.
export default function SearchBox({ variant = "site" }) {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const categories = useSelector((state) => state.category.list);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState({ top: 72, left: 12, right: 12 });
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const q = useDebounce(term.trim(), 250);
  const isAdmin = variant === "admin";

  const close = useCallback(() => { setOpen(false); setTerm(""); }, []);
  const openSearch = useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect();
    const wide = window.innerWidth >= 640;
    const width = 416;
    setPlace({ top: (rect?.bottom || 64) + 10, left: wide ? Math.max(12, (rect?.right || window.innerWidth) - width) : 12, right: wide ? undefined : 12, width: wide ? width : undefined });
    setOpen(true);
  }, []);

  // Position the panel under the header on every screen size.
  useEffect(() => {
    if (!open) return undefined;
    const place_ = () => {
      const rect = wrapRef.current?.getBoundingClientRect();
      const wide = window.innerWidth >= 640;
      const width = 416;
      setPlace({ top: (rect?.bottom || 64) + 10, left: wide ? Math.max(12, (rect?.right || window.innerWidth) - width) : 12, right: wide ? undefined : 12, width: wide ? width : undefined });
    };
    window.addEventListener("resize", place_);
    requestAnimationFrame(() => inputRef.current?.focus());
    const onDown = (event) => {
      if (!wrapRef.current?.contains(event.target) && !event.target.closest?.("[data-search-panel]")) close();
    };
    const onKey = (event) => { if (event.key === "Escape") close(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("resize", place_); document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);

  // Ctrl+K opens the admin search.
  useEffect(() => {
    if (!isAdmin) return undefined;
    const onKey = (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openSearch(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin, openSearch]);

  useEffect(() => {
    if (!open) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q.length < 2) { setItems([]); setOrders([]); setSearched(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    const requests = [api.get("/menu", { params: { search: q, limit: 5, ...(isAdmin ? {} : { available: true }) } })];
    if (isAdmin) requests.push(api.get("/orders", { params: { search: q, limit: 4 } }));
    Promise.allSettled(requests).then(([menu, ord]) => {
      if (cancelled) return;
      setItems(menu.status === "fulfilled" ? menu.value.data.items || [] : []);
      setOrders(ord?.status === "fulfilled" ? ord.value.data.orders || [] : []);
      setSearched(true);
      setActive(0);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q, open, isAdmin]);

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const list = [];
    if (isAdmin) {
      ADMIN_NAV.filter((n) => user && n.roles.includes(user.role) && (!needle || n.label.toLowerCase().includes(needle)))
        .slice(0, 5).forEach((n) => list.push({ key: n.to, group: "Pages", label: n.label, hint: n.group, to: n.to }));
      items.forEach((p) => list.push({ key: p._id, group: "Products", label: p.name, hint: p.category?.name || "", to: `/admin/menu/${p._id}/edit`, image: p.image?.url }));
      orders.forEach((o) => list.push({ key: o._id, group: "Orders", label: `#${o.orderNumber}`, hint: o.contact?.name || "", to: `/admin/orders/${o._id}` }));
    } else {
      categories.filter((c) => needle && c.name.toLowerCase().includes(needle)).slice(0, 3)
        .forEach((c) => list.push({ key: c._id, group: "Categories", label: c.name, hint: `${c.itemCount ?? 0} items`, to: `/menu?category=${c._id}` }));
      items.forEach((p) => list.push({ key: p._id, group: "Dishes", label: p.name, hint: formatPrice(p.currentPrice ?? p.price), to: `/menu/${p._id}`, image: p.image?.url, sub: p.category?.name }));
    }
    return list;
  }, [isAdmin, term, items, orders, categories, user]);

  const go = (row) => { if (!row) return; close(); navigate(row.to); };
  const submit = (event) => {
    event.preventDefault();
    if (rows[active] && (isAdmin || q.length < 2)) return go(rows[active]);
    if (!isAdmin && term.trim()) { navigate(`/menu?search=${encodeURIComponent(term.trim())}`); close(); }
    return undefined;
  };
  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((i) => Math.min(i + 1, rows.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" onClick={() => (open ? close() : openSearch())} aria-label={open ? "Close search" : "Search"} aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-brand/10 hover:text-brand" style={{ color: "var(--heading)" }}>
        {open ? <FiX size={18} /> : <FiSearch size={18} />}
      </button>

      {open && createPortal(
        <div data-search-panel role="dialog" aria-label="Search" className="fixed z-70 overflow-hidden rounded-2xl"
          style={{ top: place.top, left: place.left, right: place.right, width: place.width, background: "var(--surface)", boxShadow: "var(--shadow-card)" }}>
          <form onSubmit={submit} className="flex items-center gap-2.5 px-4 py-3">
            <FiSearch className="shrink-0 text-brand" />
            <input ref={inputRef} value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={onKeyDown} autoComplete="off" aria-label="Search"
              placeholder={isAdmin ? "Search pages, products, orders" : "Search dishes or categories"}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none ring-0 focus:outline-none focus:ring-0" style={{ color: "var(--ink)", boxShadow: "none", border: "0", outline: "none" }} />
            {isAdmin && <kbd className="hidden rounded px-1.5 py-0.5 text-[10px] sm:block" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>Esc</kbd>}
          </form>

          {(rows.length > 0 || loading || searched) && (
            <div className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain px-2 pb-2 pt-1" style={{ borderTop: "1px solid var(--line)" }}>
              {rows.map((row, index) => (
                <div key={`${row.group}-${row.key}`}>
                  {(index === 0 || rows[index - 1].group !== row.group) && <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>{row.group}</p>}
                  <Link to={row.to} onClick={() => close()} onMouseEnter={() => setActive(index)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${index === active ? "bg-brand/10" : ""}`}>
                    {row.image !== undefined && <FoodImage src={row.image} alt="" className="h-10 w-10 shrink-0 rounded-lg" />}
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{row.label}</span>{row.sub && <span className="block truncate text-xs" style={{ color: "var(--muted)" }}>{row.sub}</span>}</span>
                    <span className="shrink-0 text-xs font-semibold" style={{ color: row.group === "Dishes" ? "var(--color-brand)" : "var(--muted)" }}>{row.hint}</span>
                  </Link>
                </div>
              ))}
              {loading && <p className="px-3 py-3 text-center text-xs" style={{ color: "var(--muted)" }}>Searching...</p>}
              {!loading && searched && rows.length === 0 && <p className="px-3 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>Nothing found for "{q}"</p>}
              {!isAdmin && !loading && items.length > 0 && (
                <button type="button" onClick={submit} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-brand transition hover:bg-brand/10">See all results <FiArrowRight /></button>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
