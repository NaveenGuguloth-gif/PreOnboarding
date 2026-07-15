import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { notificationApi } from "../../services/api";

const titles = {
  "/dashboard":             "Overview",
  "/dashboard/documents":   "Documents",
  "/dashboard/learning":    "Learning",
  "/dashboard/plant-map":   "Plant Map",
  "/dashboard/relocation":  "Relocation Support",
  "/dashboard/notifications": "Notification Center",
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
  const [notifications, setNotifications] = useState([]);
  const [openNotifications, setOpenNotifications] = useState(false);
  const isEmployee = user?.userType !== "hr" && user?.user_type !== "hr";

  useEffect(() => {
    if (!isEmployee) return;
    notificationApi
      .list()
      .then((res) => setNotifications(res.data?.notifications ?? []))
      .catch(() => {});
  }, [isEmployee, pathname]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const markRead = async (id) => {
    await notificationApi.markRead(id);
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)] md:px-6">
      <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition-colors hover:border-brand-200 hover:text-brand-700 lg:hidden"
          aria-label="Open menu"
        >
          <span aria-hidden="true">Menu</span>
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="hidden text-sm font-medium text-slate-500 sm:block">Pre-onboarding workspace</p>
        </div>
      </div>

      <div className="hidden min-w-0 max-w-xl flex-1 md:block">
        <label className="relative block">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">Search</span>
          <input
            className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F5F7FB] pl-16 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
            placeholder="Search employee, task, document..."
            type="search"
          />
        </label>
      </div>

      <div className="flex items-center gap-3 text-base text-slate-600">
        {isEmployee ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenNotifications((value) => !value)}
              className="relative grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-brand-200 hover:text-brand-700"
              aria-label="Notifications"
            >
              ◌
              {unreadCount > 0 ? (
                <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            {openNotifications ? (
              <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-950">Notifications</p>
                    <Link
                      to="/dashboard/notifications"
                      onClick={() => setOpenNotifications(false)}
                      className="text-xs font-semibold text-brand-700 hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-slate-500">No notifications yet.</p>
                  ) : (
                    notifications.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => markRead(item.id)}
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-[#F5F7FB]"
                      >
                        <span className="block text-sm font-semibold text-slate-950">{item.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600">{item.message}</span>
                        <span className="mt-2 block text-xs text-slate-500">
                          {item.read ? "Read" : "Unread"} · {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition-all hover:border-brand-200 hover:text-brand-700"
          aria-label="Settings"
        >
          ⚙
        </button>
        <Link
          to="/dashboard/assistant"
          className="hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-200 hover:text-brand-700 sm:inline-flex"
        >
          Ask AI
        </Link>
        {user?.employeeId && (
          <span className="hidden rounded-2xl border border-slate-200 bg-[#F5F7FB] px-3 py-2 font-mono text-sm text-slate-600 lg:inline-flex">
            {user.employeeId}
          </span>
        )}
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-700 text-sm font-bold text-white shadow-[0_10px_20px_rgba(75,31,166,0.22)]">
          {user?.name?.[0]?.toUpperCase() ?? "U"}
        </div>
      </div>
      </div>
    </header>
  );
}
