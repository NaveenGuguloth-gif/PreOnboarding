import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { candidateApi } from "../../services/api";
import { Card } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

// One accent per track — reused across the ring metrics and quick links
// so a color always means the same thing across the dashboard.
const TRACK = {
  profile: { accent: "#C58F73", from: "#C58F73", to: "#8A857E", soft: "bg-orange-500/10", text: "text-orange-300", panel: "linear-gradient(135deg, #F2E0D5, #FDFBF7)" },
  documents: { accent: "#6B7A68", from: "#A3B19B", to: "#6B7A68", soft: "bg-lime-500/10", text: "text-lime-300", panel: "linear-gradient(135deg, #DDE7D9, #F4F6F4)" },
  learning: { accent: "#475569", from: "#475569", to: "#0F172A", soft: "bg-cyan-500/10", text: "text-cyan-300", panel: "linear-gradient(135deg, #DDE6F0, #F1F5F9)" },
  readiness: { accent: "#2E302F", from: "#2E302F", to: "#1C231F", soft: "bg-amber-500/10", text: "text-amber-300", panel: "linear-gradient(135deg, #D7DDD4, #F2E8E0)" },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    candidateApi
      .getMetrics()
      .then((r) => setMetrics(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const daysLeft = metrics?.daysRemaining ?? "—";
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const quickLinks = [
    { to: "/dashboard/documents", title: "Documents", desc: "Upload required documents", icon: "📄", pct: metrics?.documentCompletion, track: TRACK.documents },
    { to: "/dashboard/learning", title: "Learning", desc: "Complete onboarding modules", icon: "🎓", pct: metrics?.learningCompletion, track: TRACK.learning },
    { to: "/dashboard/relocation", title: "Relocation", desc: "Housing & transport support", icon: "🗺️", pct: null, track: TRACK.profile },
    { to: "/dashboard/assistant", title: "AI Assistant", desc: "Ask questions about onboarding", icon: "🤖", pct: null, track: TRACK.readiness },
  ];

  const joiningDetails = [
    { label: "Name", value: user?.name },
    { label: "Employee ID", value: user?.employeeId },
    { label: "Department", value: user?.department },
    { label: "Location", value: user?.location },
    { label: "Role", value: user?.role },
    { label: "Joining", value: user?.joiningDate },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-900 p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #C58F73, transparent 70%)" }}
        />
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#FDFBF7" }}>Onboarding</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Welcome, {firstName}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-base" style={{ color: "#E5E5E5" }}>
          <span className="rounded-full border px-3 py-1 font-semibold" style={{ borderColor: "#C58F73", backgroundColor: "rgba(197, 143, 115, 0.22)", color: "#FDFBF7" }}>
            {daysLeft} days to join
          </span>
          {user?.department ? <span>{user.department}</span> : null}
          {user?.location ? <span>· {user.location}</span> : null}
        </div>
      </div>

      {/* Ring metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <RingMetric label="Profile" value={metrics?.profileCompletion} track={TRACK.profile} />
        <RingMetric label="Documents" value={metrics?.documentCompletion} track={TRACK.documents} />
        <RingMetric label="Learning" value={metrics?.learningCompletion} track={TRACK.learning} />
        <RingMetric label="Readiness" value={metrics?.readinessScore} track={TRACK.readiness} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(({ to, title, desc, icon, pct, track }) => (
          <Link key={to} to={to}>
            <div
              className="group h-full rounded-2xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700"
              style={{ borderTopColor: track.accent, borderTopWidth: 4, background: track.panel }}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${track.soft}`}>{icon}</span>
              <p className="mt-4 text-base font-semibold text-white">{title}</p>
              <p className="mt-1 text-sm text-gray-400">{desc}</p>
              {pct != null && (
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: track.accent }}
                    />
                  </div>
                  <p className={`mt-1.5 text-sm font-semibold ${track.text}`}>{pct}% complete</p>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Joining info */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-white">Joining Details</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[920px] rounded-lg border border-gray-800">
            <div className="grid grid-cols-6 border-b border-gray-800 bg-gray-950/60 text-sm font-semibold uppercase tracking-wide text-gray-400">
              {joiningDetails.map(({ label }) => (
                <div key={label} className="px-4 py-3">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-6 text-base font-medium text-white">
              {joiningDetails.map(({ label, value }) => (
                <div key={label} className="min-w-0 px-4 py-4">
                  <span className="block truncate">{value ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RingMetric({ label, value, track }) {
  const percent = Math.min(100, Math.max(0, value ?? 0));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const gradientId = `ring-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4" style={{ background: `linear-gradient(135deg, ${track.accent}24, #FDFBF7)` }}>
      <div className="flex items-center gap-3">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={radius} fill="none" stroke="#E5E5E5" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 700ms ease" }}
            />
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={track.from} />
                <stop offset="100%" stopColor={track.to} />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-base font-bold text-white">{value != null ? `${percent}%` : "—"}</span>
        </div>
        <p className="text-base font-medium text-gray-300">{label}</p>
      </div>
    </div>
  );
}
