// Role helpers for the interface. The server enforces every permission; these only decide what to show.

export const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "User",
  CUSTOMER: "Customer",
};

export const ROLE_STYLES = {
  SUPER_ADMIN: "bg-brand/15 text-brand",
  ADMIN: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  STAFF: "bg-teal-100 text-teal-700",
  CUSTOMER: "bg-gray-200 text-gray-700",
};

export const EMPLOYEE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"];

export const isEmployee = (user) => Boolean(user && EMPLOYEE_ROLES.includes(user.role));

// Admin panel navigation. `roles` lists who sees the link; `group` organises the sidebar.
export const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: "FiGrid", end: true, group: "Overview", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { to: "/admin/orders", label: "Orders", icon: "FiShoppingBag", group: "Operations", roles: EMPLOYEE_ROLES },
  { to: "/admin/reservations", label: "Reservations", icon: "FiCalendar", group: "Operations", roles: EMPLOYEE_ROLES },
  { to: "/admin/menu", label: "Products", icon: "FiCoffee", group: "Catalogue", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"] },
  { to: "/admin/categories", label: "Categories", icon: "FiLayers", group: "Catalogue", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { to: "/admin/combos", label: "Combos", icon: "FiPackage", group: "Catalogue", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { to: "/admin/coupons", label: "Coupons and offers", icon: "FiTag", group: "Catalogue", roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/admin/banners", label: "Banners", icon: "FiImage", group: "Catalogue", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { to: "/admin/customers", label: "Customers", icon: "FiUsers", group: "Customers", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { to: "/admin/reviews", label: "Reviews", icon: "FiStar", group: "Customers", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { to: "/admin/newsletter", label: "Newsletter", icon: "FiMail", group: "Customers", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { to: "/admin/messages", label: "Customer support", icon: "FiMessageSquare", group: "Customers", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { to: "/admin/team", label: "Team", icon: "FiUserCheck", group: "Administration", roles: ["SUPER_ADMIN", "MANAGER", "ADMIN"] },
  { to: "/admin/chat", label: "Team chat", icon: "FiMessageCircle", group: "Team", roles: EMPLOYEE_ROLES },
  { to: "/admin/attendance", label: "Attendance and leave", icon: "FiClock", group: "Team", roles: EMPLOYEE_ROLES },
  { to: "/admin/payroll", label: "Payroll", icon: "FiCreditCard", group: "Team", roles: ["SUPER_ADMIN"] },
  { to: "/admin/inventory", label: "Inventory", icon: "FiBox", group: "Stock and finance", roles: EMPLOYEE_ROLES },
  { to: "/admin/purchasing", label: "Suppliers and purchasing", icon: "FiTruck", group: "Stock and finance", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { to: "/admin/costing", label: "Product costing", icon: "FiPercent", group: "Stock and finance", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"] },
  { to: "/admin/expenses", label: "Expenses", icon: "FaRupeeSign", group: "Stock and finance", roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/admin/reports", label: "Reports", icon: "FiBarChart2", group: "Stock and finance", roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/admin/activity", label: "Activity logs", icon: "FiActivity", group: "Administration", roles: EMPLOYEE_ROLES },
  { to: "/admin/settings", label: "Website settings", icon: "FiSettings", group: "Administration", roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/admin/security", label: "Settings and security", icon: "FiShield", group: "Administration", roles: EMPLOYEE_ROLES },
];
