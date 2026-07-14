import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/dashboard", icon: "dashboard", label: "Executive Dashboard" },
  { to: "/suppliers", icon: "location_city", label: "Supplier Directory" },
  { to: "/alerts", icon: "crisis_alert", label: "Mobile Alerts" },
  { to: "/audits", icon: "assignment_turned_in", label: "Audit Reports" },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="flex flex-col h-screen w-64 fixed left-0 top-0 pt-4 pb-8 glass z-40">
        <div className="px-6 mb-6">
          <span className="text-xl font-bold tracking-tight text-primary lowercase">
            tavera
          </span>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `py-3 px-6 flex items-center font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary-container/20 text-primary border-l-4 border-primary"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`
              }
            >
              <span className="material-symbols-outlined mr-3">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          <div className="mt-auto">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `py-3 px-6 flex items-center font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary-container/20 text-primary border-l-4 border-primary"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`
              }
            >
              <span className="material-symbols-outlined mr-3">settings</span>
              Settings
            </NavLink>
          </div>
        </nav>
      </aside>
      <main className="ml-64 flex-1 min-h-screen p-6">
        <Outlet />
      </main>
    </div>
  );
}
