import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const candidateNav = [
  { to: "/dashboard",             label: "Overview",    icon: "⌂" },
  { to: "/dashboard/documents",   label: "Documents",   icon: "▣" },
  { to: "/dashboard/learning",    label: "Learning",    icon: "◈" },
  { to: "/dashboard/relocation",  label: "Relocation",  icon: "◇" },
  { to: "/dashboard/notifications", label: "Notifications", icon: "◌" },
  { to: "/dashboard/assistant",   label: "Assistant",   icon: "✦" },
];

const hrNav = [
  { to: "/hr",  label: "HR Dashboard", icon: "⌂" },
  { to: "/hr/candidates", label: "Candidates", icon: "◎" },
  { to: "/hr/tasks", label: "Tasks", icon: "✓" },
  { to: "/hr/documents", label: "Documents", icon: "▣" },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const isHr             = user?.userType === "hr";
  const navItems         = isHr ? hrNav : candidateNav;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-[#1C231F]/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-72 bg-[#2C0A73] border-r border-white/10
          flex flex-col transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-[#24075F] px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#4B1FA6] font-bold shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
            T
          </div>
          <div>
            <p className="text-base font-bold leading-tight tracking-tight text-white">Tata Motors</p>
            <p className="text-sm font-medium text-white/65">Pre-Onboarding</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5" aria-label="Primary navigation">
          {navItems.map(({ to, label, icon, disabled, count }) => (
            disabled ? (
              <button
                key={label}
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-sm font-bold text-white">{icon}</span>
                <span className="flex-1">{label}</span>
                {count ? (
                  <span className="rounded-full bg-[#C58F73] px-2 py-0.5 text-sm font-semibold text-white">{count}</span>
                ) : null}
              </button>
            ) : (
            <NavLink
              key={to}
              to={to}
              end={to === "/dashboard" || to === "/hr"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-200
                ${isActive
                  ? "bg-[#5B2AC9] text-white shadow-[0_12px_24px_rgba(0,0,0,0.16)]"
                  : "text-white/70 hover:bg-white/10 hover:text-white"}`
              }
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-sm font-bold text-white">{icon}</span>
              {label}
            </NavLink>
            )
          ))}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-white/10 bg-[#24075F] px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sm font-bold text-white">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.name ?? "Demo User"}</p>
              <p className="truncate text-xs text-white/60">{user?.email ?? "demo@tatamotors.com"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
