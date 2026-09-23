// export const ROLE_MODULES = {
//   SUPER_ADMIN: ["dashboard","pos","inventory","purchases","customers","vendors","accounting","reports","users","settings","backups"],
//   MANAGER: ["dashboard","pos","inventory","purchases","customers","vendors","reports"],
//   CASHIER: ["pos","customers"],
//   ACCOUNTANT: ["dashboard","accounting","customers","vendors","reports"],
//   INVENTORY_STAFF: ["inventory","purchases","vendors"],
// };

// export const NAV_ITEMS = [
//   { href: "/dashboard", label: "Dashboard", module: "dashboard" },
//   { href: "/pos", label: "POS", module: "pos" },
//   { href: "/inventory", label: "Inventory", module: "inventory" },
//   { href: "/inventory/ledger", label: "Stock Ledger", module: "inventory" },
//   { href: "/inventory/valuation", label: "Stock Valuation", module: "inventory" },
//   { href: "/inventory/barcodes", label: "Barcode Labels", module: "inventory" },
//   { href: "/purchases", label: "Purchases", module: "purchases" },
//   { href: "/customers", label: "Customers", module: "customers" },
//   { href: "/vendors", label: "Vendors", module: "vendors" },
//   { href: "/accounting", label: "Accounting", module: "accounting" },
//   { href: "/accounting/ledger", label: "General Ledger", module: "accounting" },
//   { href: "/accounting/trial-balance", label: "Trial Balance", module: "accounting" },
//   { href: "/accounting/accounts", label: "Chart of Accounts", module: "accounting" },
//   { href: "/accounting/reports", label: "Financial Statements", module: "accounting" },
//   { href: "/reports", label: "Reports", module: "reports" },
//   { href: "/users", label: "Users & Roles", module: "users" },
//   { href: "/admin/audit-logs", label: "Audit Logs", module: "users" },
//   { href: "/admin/login-history", label: "Login History", module: "users" },
//   { href: "/admin/backups", label: "Backups", module: "backups" },
//   { href: "/settings", label: "Settings", module: "settings" },
// ];

// export function roleCanAccessModule(role, moduleName) { return ROLE_MODULES[role]?.includes(moduleName) ?? false; }
// export function sessionHasPermission(session, moduleName, action = "view") {
//   if (!session?.user) return false;
//   if (session.user.role === "SUPER_ADMIN") return true;
//   return session.user.permissions?.includes(`${moduleName}:${action}`) ?? false;
// }


export const ROLE_HOME = {
  SUPER_ADMIN: "/dashboard",
  MANAGER: "/dashboard",
  CASHIER: "/pos",
  ACCOUNTANT: "/dashboard",
  INVENTORY_STAFF: "/inventory",
};

export const ROLE_MODULES = {
  SUPER_ADMIN: [
    "dashboard",
    "pos",
    "inventory",
    "purchases",
    "customers",
    "vendors",
    "accounting",
    "reports",
    "users",
    "settings",
    "backups",
  ],

  MANAGER: [
    "dashboard",
    "pos",
    "inventory",
    "purchases",
    "customers",
    "vendors",
    "reports",
  ],

  CASHIER: [
    "pos",
    "customers",
  ],

  ACCOUNTANT: [
    "dashboard",
    "accounting",
    "customers",
    "vendors",
    "reports",
  ],

  INVENTORY_STAFF: [
    "inventory",
    "purchases",
    "vendors",
  ],
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", module: "dashboard" },
  { href: "/pos", label: "POS", module: "pos" },

  { href: "/inventory", label: "Inventory", module: "inventory" },
  { href: "/inventory/ledger", label: "Stock Ledger", module: "inventory" },
  { href: "/inventory/valuation", label: "Stock Valuation", module: "inventory" },
  { href: "/inventory/barcodes", label: "Barcode Labels", module: "inventory" },

  { href: "/purchases", label: "Purchases", module: "purchases" },

  { href: "/customers", label: "Customers", module: "customers" },
  { href: "/vendors", label: "Vendors", module: "vendors" },

  { href: "/accounting", label: "Accounting", module: "accounting" },
  { href: "/accounting/ledger", label: "General Ledger", module: "accounting" },
  { href: "/accounting/trial-balance", label: "Trial Balance", module: "accounting" },
  { href: "/accounting/accounts", label: "Chart of Accounts", module: "accounting" },
  { href: "/accounting/reports", label: "Financial Statements", module: "accounting" },

  { href: "/reports", label: "Reports", module: "reports" },

  { href: "/users", label: "Users & Roles", module: "users" },
  { href: "/admin/audit-logs", label: "Audit Logs", module: "users" },
  { href: "/admin/login-history", label: "Login History", module: "users" },

  { href: "/admin/backups", label: "Backups", module: "backups" },
  { href: "/settings", label: "Settings", module: "settings" },
];

export function roleCanAccessModule(role, moduleName) {
  return ROLE_MODULES[role]?.includes(moduleName) ?? false;
}

export function sessionHasPermission(session, moduleName, action = "view") {
  if (!session?.user) return false;

  if (session.user.role === "SUPER_ADMIN") {
    return true;
  }

  return (
    session.user.permissions?.includes(`${moduleName}:${action}`) ?? false
  );
}

export function getVisibleNavItems(session) {
  if (!session?.user) return [];

  return NAV_ITEMS.filter((item) =>
    sessionHasPermission(session, item.module, "view")
  );
}