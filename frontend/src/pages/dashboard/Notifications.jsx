import { useEffect, useMemo, useState } from "react";
import { notificationApi } from "../../services/api";
import { Badge } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const filters = [
  { id: "all", label: "All" },
  { id: "pending_tasks", label: "Pending tasks" },
  { id: "hr_announcement", label: "HR announcements" },
  { id: "learning_reminder", label: "Learning reminders" },
  { id: "document_approval", label: "Document approvals" },
  { id: "joining_reminder", label: "Joining reminders" },
  { id: "welcome", label: "Welcome messages" },
];

const typeLabels = {
  pending_tasks: "Pending tasks",
  hr_announcement: "HR announcement",
  learning_reminder: "Learning reminder",
  document_approval: "Document approval",
  joining_reminder: "Joining reminder",
  welcome: "Welcome",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [activeType, setActiveType] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = () =>
    notificationApi
      .list()
      .then((res) => setNotifications(res.data?.notifications ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => notifications
      .filter((item) => activeType === "all" || item.type === activeType)
      .filter((item) => readFilter === "all" || (readFilter === "unread" ? !item.read : item.read)),
    [activeType, notifications, readFilter]
  );

  const unreadCount = notifications.filter((item) => !item.read).length;

  const markRead = async (id) => {
    await notificationApi.markRead(id);
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="w-full space-y-6">
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-400">Notification Center</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">Onboarding alerts and reminders</h2>
            <p className="mt-1 text-sm text-gray-400">Track HR updates, pending actions, approvals, learning reminders, and joining messages in one place.</p>
          </div>
          <Badge color={unreadCount > 0 ? "red" : "green"}>{unreadCount} unread</Badge>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveType(filter.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              activeType === filter.id
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-800 bg-gray-950/60 text-gray-400 hover:text-white"
            }`}
          >
            {filter.label}
          </button>
        ))}
        {[
          ["all", "All status"],
          ["unread", "Unread"],
          ["read", "Read"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setReadFilter(value)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              readFilter === value
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-gray-800 bg-gray-950/60 text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-sm text-gray-400">
            No notifications in this category.
          </div>
        ) : (
          filtered.map((item) => (
            <article
              key={item.id}
              className={`rounded-2xl border bg-gray-900 p-5 transition ${
                item.read ? "border-gray-800" : "border-indigo-500"
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={item.priority === "high" ? "red" : "blue"}>{typeLabels[item.type] ?? "Notification"}</Badge>
                    <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-400">{item.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => markRead(item.id)}
                  disabled={item.read}
                  className="rounded-lg border border-gray-800 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {item.read ? "Read" : "Mark read"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
