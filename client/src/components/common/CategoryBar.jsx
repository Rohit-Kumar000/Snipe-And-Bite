import { useRef } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

// Horizontal category chips. selected is a category id, or "" for all.
export default function CategoryBar({ categories, selected, onSelect }) {
  const railRef = useRef(null);
  const move = (direction) => railRef.current?.scrollBy({ left: direction * Math.max(220, railRef.current.clientWidth * 0.7), behavior: "smooth" });
  const chipStyle = (active) => (active ? undefined : { borderColor: "var(--line-strong)", background: "var(--surface)", color: "var(--ink)" });
  const chip = (active) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
      active ? "border-brand bg-brand text-white" : "hover:border-brand"
    }`;

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => move(-1)} aria-label="Scroll categories left" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border transition hover:border-brand hover:text-brand sm:flex" style={{ borderColor: "var(--line-strong)" }}><FiChevronLeft /></button>
      <div ref={railRef} className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button type="button" className={chip(selected === "")} style={chipStyle(selected === "")} onClick={() => onSelect("")}>
        All
      </button>
      {categories.map((category) => (
        <button
          key={category._id}
          type="button"
          className={chip(selected === category._id)}
          style={chipStyle(selected === category._id)}
          onClick={() => onSelect(category._id)}
        >
          {category.name}{typeof category.itemCount === "number" && <span className="ml-1.5 text-xs opacity-70">{category.itemCount}</span>}
        </button>
      ))}
      </div>
      <button type="button" onClick={() => move(1)} aria-label="Scroll categories right" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border transition hover:border-brand hover:text-brand sm:flex" style={{ borderColor: "var(--line-strong)" }}><FiChevronRight /></button>
    </div>
  );
}
