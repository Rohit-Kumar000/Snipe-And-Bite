import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../components/common/Loader";
import { PasswordChangeGate } from "../components/auth/AccountGates";

// Only logged in users can open the nested routes.
export default function ProtectedRoute() {
  const { user, initialized, sessionEnded } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!initialized) return <Loader fullPage />;
  // A session that ended on its own goes to the home page. A visitor who never signed in goes to the login page.
  if (!user) return sessionEnded ? <Navigate to="/" replace /> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (user.mustChangePassword) return <PasswordChangeGate />;
  return <Outlet />;
}
