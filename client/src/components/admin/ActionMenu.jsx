import { useEffect, useRef, useState } from "react";
import { FiMoreVertical } from "react-icons/fi";

// Three-dot menu. items: [{ label, onClick, danger?, hidden? }]. Closes on outside click, Escape and selection.
export default function ActionMenu({ items, label = "Actions" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const ref = useRef(null);
  const visible = items.filter((item) => !item.hidden);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);

  if (visible.length === 0) return null;
  return (
    <div ref={ref} className="relative inline-block text-left">
      <button type="button" onClick={(event) => {
        // Fixed positioning keeps the menu visible even inside a scrolling table.
        const rect = event.currentTarget.getBoundingClientRect();
        const height = visible.length * 42 + 8;
        const openUp = rect.bottom + height > window.innerHeight - 8;
        setPos({ top: openUp ? Math.max(8, rect.top - height - 4) : rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
        setOpen((v) => !v);
      }} aria-haspopup="menu" aria-expanded={open} aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:border-brand hover:text-brand" style={{ borderColor: "var(--line-strong)" }}><FiMoreVertical /></button>
      {open && (
        <ul role="menu" className="card fixed z-50 w-52 overflow-hidden py-1" style={{ top: pos.top, right: pos.right }}>
          {visible.map((item) => (
            <li key={item.label} role="none">
              <button type="button" role="menuitem" onClick={() => { setOpen(false); item.onClick(); }} className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-brand/10 ${item.danger ? "text-red-500" : ""}`}>{item.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
