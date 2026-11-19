import { lazy, Suspense, useEffect } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchSettings } from "./features/settings/settingsSlice";
import { loadUser, restoreTabSession } from "./features/auth/authSlice";
import { requestOpenTabToken } from "./services/sessionStore";

import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import ScrollToTop from "./components/common/ScrollToTop";
import WhatsAppButton from "./components/common/WhatsAppButton";
import SessionGuard from "./components/auth/SessionGuard";
import Loader from "./components/common/Loader";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import AdminLayout from "./components/admin/AdminLayout";

import Home from "./pages/Home";
import Menu from "./pages/Menu";
import ItemDetail from "./pages/ItemDetail";
import Offers from "./pages/Offers";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import MyOrders from "./pages/MyOrders";
import OrderTracking from "./pages/OrderTracking";
import Reservation from "./pages/Reservation";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsRefund from "./pages/TermsRefund";
import ShippingPolicy from "./pages/ShippingPolicy";
import NotFound from "./pages/NotFound";
import Reviews from "./pages/Reviews";
import Faq from "./pages/Faq";
import Wishlist from "./pages/Wishlist";
import OAuthCallback from "./pages/OAuthCallback";
import VerifyEmail from "./pages/VerifyEmail";

// Admin pages are loaded only when an admin opens them.
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ManageMenu = lazy(() => import("./pages/admin/ManageMenu"));
const MenuForm = lazy(() => import("./pages/admin/MenuForm"));
const ManageCategories = lazy(() => import("./pages/admin/ManageCategories"));
const ManageCombos = lazy(() => import("./pages/admin/ManageCombos"));
const ManageOrders = lazy(() => import("./pages/admin/ManageOrders"));
const OrderDetail = lazy(() => import("./pages/admin/OrderDetail"));
const ManageCoupons = lazy(() => import("./pages/admin/ManageCoupons"));
const ManageReservations = lazy(() => import("./pages/admin/ManageReservations"));
const ManageCustomers = lazy(() => import("./pages/admin/ManageCustomers"));
const ManageBanners = lazy(() => import("./pages/admin/ManageBanners"));
const ManageReviews = lazy(() => import("./pages/admin/ManageReviews"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const ManageTeam = lazy(() => import("./pages/admin/ManageTeam"));
const ManageMessages = lazy(() => import("./pages/admin/ManageMessages"));
const ActivityLogs = lazy(() => import("./pages/admin/ActivityLogs"));
const SecurityPage = lazy(() => import("./pages/admin/SecurityPage"));
const Newsletter = lazy(() => import("./pages/admin/Newsletter"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const TeamChat = lazy(() => import("./pages/admin/TeamChat"));
const Inventory = lazy(() => import("./pages/admin/Inventory"));
const Purchasing = lazy(() => import("./pages/admin/Purchasing"));
const ProductCosting = lazy(() => import("./pages/admin/ProductCosting"));
const Expenses = lazy(() => import("./pages/admin/Expenses"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const Attendance = lazy(() => import("./pages/admin/Attendance"));
const Payroll = lazy(() => import("./pages/admin/Payroll"));

// Navbar, footer and the floating WhatsApp button wrap every customer page.
function PublicLayout() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main key={location.pathname} className="page-enter flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  // Restore Remember Me from persistent storage, or ask another open tab to share its temporary login.
  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (token) {
        dispatch(loadUser());
        return;
      }
      const sharedToken = await requestOpenTabToken();
      if (!active) return;
      if (sharedToken) {
        dispatch(restoreTabSession(sharedToken));
        dispatch(loadUser());
      } else {
        // If browser storage is unavailable, the HTTP-only Remember Me cookie can still restore the session.
        dispatch(loadUser());
      }
    };
    restore();
    return () => { active = false; };
    // The token is read only on the first load. Later changes come from login and logout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ScrollToTop />
      <SessionGuard />
      <Suspense fallback={<Loader fullPage />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/menu/:id" element={<ItemDetail />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-refund" element={<TermsRefund />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-success/:id" element={<OrderSuccess />} />
              <Route path="/orders" element={<MyOrders />} />
              <Route path="/orders/:id" element={<OrderTracking />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/reservation" element={<Reservation />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/orders" element={<ManageOrders />} />
              <Route path="/admin/orders/:id" element={<OrderDetail />} />
              <Route path="/admin/menu" element={<ManageMenu />} />
              <Route path="/admin/menu/new" element={<MenuForm />} />
              <Route path="/admin/menu/:id/edit" element={<MenuForm />} />
              <Route path="/admin/categories" element={<ManageCategories />} />
              <Route path="/admin/combos" element={<ManageCombos />} />
              <Route path="/admin/coupons" element={<ManageCoupons />} />
              <Route path="/admin/reservations" element={<ManageReservations />} />
              <Route path="/admin/customers" element={<ManageCustomers />} />
              <Route path="/admin/banners" element={<ManageBanners />} />
              <Route path="/admin/reviews" element={<ManageReviews />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin/team" element={<ManageTeam />} />
              <Route path="/admin/messages" element={<ManageMessages />} />
              <Route path="/admin/activity" element={<ActivityLogs />} />
              <Route path="/admin/security" element={<SecurityPage />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
              <Route path="/admin/newsletter" element={<Newsletter />} />
              <Route path="/admin/chat" element={<TeamChat />} />
              <Route path="/admin/inventory" element={<Inventory />} />
              <Route path="/admin/purchasing" element={<Purchasing />} />
              <Route path="/admin/costing" element={<ProductCosting />} />
              <Route path="/admin/expenses" element={<Expenses />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/attendance" element={<Attendance />} />
              <Route path="/admin/payroll" element={<Payroll />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
