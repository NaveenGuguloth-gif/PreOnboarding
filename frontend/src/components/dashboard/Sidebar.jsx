import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const candidateNav = [
  { to: "/dashboard",             label: "Overview",    icon: "□" },
  { to: "/dashboard/documents",   label: "Documents",   icon: "D" },
  { to: "/dashboard/learning",    label: "Learning",    icon: "L" },
  { to: "/dashboard/relocation",  label: "Relocation",  icon: "R" },
  { to: "/dashboard/assistant",   label: "Assistant",   icon: "A" },
];

const hrNav = [
  { to: "/hr",  label: "HR Dashboard", icon: "H" },
  { to: "/hr/candidates", label: "Candidates", icon: "C" },
  { to: "/hr/tasks", label: "Tasks", icon: "T" },
  { to: "/hr/documents", label: "Documents", icon: "F" },
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
          w-64 bg-[#2E302F] border-r border-[#6B7A68]/70
          flex flex-col transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-[#6B7A68]/60 bg-[#1C231F] px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C58F73] text-white font-bold shadow-sm">
            T
          </div>
          <div>
            <p className="text-base font-semibold leading-tight tracking-tight text-[#FDFBF7]">Tata Motors</p>
            <p className="text-sm text-[#A3B19B]">Pre-Onboarding</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary navigation">
          {navItems.map(({ to, label, icon, disabled, count }) => (
            disabled ? (
              <button
                key={label}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base font-medium text-[#A3B19B] transition-all duration-200 hover:bg-[#1C231F] hover:text-[#FDFBF7]"
              >
                <span className="w-5 text-center text-sm font-bold text-current/80">{icon}</span>
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
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-all duration-200
                ${isActive
                  ? "bg-[#C58F73] text-[#FFFFFF] shadow-sm"
                  : "text-[#A3B19B] hover:bg-[#1C231F] hover:text-[#FDFBF7]"}`
              }
            >
              <span className="w-5 text-center text-sm font-bold text-current/80">{icon}</span>
              {label}
            </NavLink>
            )
          ))}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-[#6B7A68]/60 bg-[#1C231F] px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#6B7A68]/60 bg-[#2E302F] text-sm font-bold text-[#FDFBF7]">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-[#FDFBF7]">{user?.name ?? "Demo User"}</p>
              <p className="truncate text-sm text-[#A3B19B]">{user?.email ?? "demo@tatamotors.com"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-2 py-2 text-left text-base text-[#A3B19B] transition-colors hover:bg-[#2E302F] hover:text-[#FDFBF7]"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
