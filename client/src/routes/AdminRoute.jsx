import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../components/common/Loader";
import { PasswordChangeGate, TwoFactorRequiredGate } from "../components/auth/AccountGates";
import { ADMIN_NAV, isEmployee } from "../utils/roles";

// Any employee role can enter the panel. Each page is limited to the roles listed in ADMIN_NAV.
// The API enforces the same rules on the server.
export default function AdminRoute() {
  const { user, initialized, twoFactorSetupRequired, sessionEnded } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!initialized) return <Loader fullPage />;
  // A session that ended on its own goes to the home page. A visitor who never signed in goes to the login page.
  if (!user) return sessionEnded ? <Navigate to="/" replace /> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!isEmployee(user)) return <Navigate to="/" replace />;
  if (user.mustChangePassword) return <PasswordChangeGate />;
  if (twoFactorSetupRequired) return <TwoFactorRequiredGate />;

  // Detail pages such as /admin/orders/123 inherit the rule of their parent section.
  const section = ADMIN_NAV.filter((item) => !item.end && (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];
  const rule = section || ADMIN_NAV.find((item) => item.end && item.to === location.pathname);
  if (rule && !rule.roles.includes(user.role)) {
    const home = ADMIN_NAV.find((item) => item.roles.includes(user.role));
    return <Navigate to={home?.to || "/"} replace />;
  }
  return <Outlet />;
}
