import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const titles = {
  "/dashboard":             "Overview",
  "/dashboard/documents":   "Documents",
  "/dashboard/learning":    "Learning",
  "/dashboard/relocation":  "Relocation Support",
  "/dashboard/assistant":   "AI Assistant",
  "/hr":                    "HR Dashboard",
  "/hr/candidates":         "Candidates",
  "/hr/tasks":              "Tasks",
  "/hr/documents":          "Documents",
};

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation();
  const { user }     = useAuth();
  const title        = titles[pathname] ?? "Portal";

  return (
    <header className="border-b border-[#475569]/35 bg-[#475569]/95 px-4 py-4 backdrop-blur md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg border border-[#A3B19B]/50 bg-[#FDFBF7] p-2 text-[#475569] transition-colors hover:text-[#0F172A] lg:hidden"
          aria-label="Open menu"
        >
          <span aria-hidden="true">Menu</span>
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#FDFBF7]">{title}</h1>
          <p className="hidden text-sm text-[#E5E5E5] sm:block">Pre-onboarding workspace</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-base text-[#E5E5E5]">
        <Link
          to="/dashboard/assistant"
          className="hidden rounded-lg border border-[#A3B19B]/50 bg-[#FDFBF7] px-3 py-2 text-sm font-medium text-[#475569] transition-colors hover:border-[#C58F73] hover:text-[#0F172A] sm:inline-flex"
        >
          Ask AI
        </Link>
        {user?.employeeId && (
          <span className="rounded-lg border border-[#A3B19B]/50 bg-[#FDFBF7] px-3 py-2 font-mono text-sm text-[#475569]">
            {user.employeeId}
          </span>
        )}
      </div>
    </header>
  );
}
