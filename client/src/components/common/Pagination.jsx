import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;

  // Show a small window of page numbers around the current page.
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = [];
  for (let n = start; n <= Math.min(pages, start + 4); n++) numbers.push(n);

  return (
    <div className="mt-8 flex items-center justify-center gap-1.5">
      <button
        type="button"
        className="btn-ghost btn-sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <FiChevronLeft />
      </button>
      {numbers.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-full text-sm font-semibold transition ${
            n === page ? "bg-brand text-white" : "hover:bg-black/5"
          }`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className="btn-ghost btn-sm"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <FiChevronRight />
      </button>
    </div>
  );
}
