import { Link, useLocation } from "react-router-dom";
import { FiChevronRight, FiHome } from "react-icons/fi";
import { ADMIN_NAV } from "../../utils/roles";

const EXTRA = { new: "New", edit: "Edit" };

// Builds "Admin / Orders / Details" from the current URL.
export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean).slice(1); // drop "admin"
  const crumbs = [{ to: "/admin", label: "Admin" }];
  let path = "/admin";
  parts.forEach((part, index) => {
    path += `/${part}`;
    const nav = ADMIN_NAV.find((item) => item.to === path);
    const isId = /^[a-f0-9]{24}$/i.test(part);
    const label = nav?.label || EXTRA[part] || (isId ? "Details" : part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " "));
    crumbs.push({ to: index === parts.length - 1 ? null : path, label });
  });
  if (parts.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
      <FiHome size={13} />
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
          {index > 0 && <FiChevronRight size={12} />}
          {crumb.to ? <Link to={crumb.to} className="hover:text-brand">{crumb.label}</Link> : <span aria-current="page" className="font-semibold" style={{ color: "var(--ink)" }}>{crumb.label}</span>}
        </span>
      ))}
    </nav>
  );
}
