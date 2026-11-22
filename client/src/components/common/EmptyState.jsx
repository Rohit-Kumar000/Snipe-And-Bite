import { Link } from "react-router-dom";

export default function EmptyState({ icon, title, text, actionLabel, actionTo }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      {icon && <div className="text-5xl text-brand/70">{icon}</div>}
      <h3 className="text-xl font-semibold text-choco">{title}</h3>
      {text && <p className="max-w-md text-sm text-gray-500">{text}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary mt-2">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
