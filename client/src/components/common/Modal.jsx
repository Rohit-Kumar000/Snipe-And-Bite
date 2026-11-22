import { useEffect } from "react";
import { FiX } from "react-icons/fi";

const SIZES = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

export default function Modal({ open, onClose, title, size = "md", children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${SIZES[size]}`}>
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h3 className="text-lg font-semibold text-choco">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5" aria-label="Close">
            <FiX size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
