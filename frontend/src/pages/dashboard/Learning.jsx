import { useEffect, useMemo, useRef, useState } from "react";
import { learningApi } from "../../services/api";
import { Badge } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

// --- Category theming -------------------------------------------------
// Each category gets its own accent so the board reads at a glance,
// the way a course catalog color-codes tracks.
const CATEGORY_THEME = {
  safety: { accent: "#EF4444", soft: "bg-rose-500/10", text: "text-rose-300", ring: "#EF4444" },
  compliance: { accent: "#F59E0B", soft: "bg-amber-500/10", text: "text-amber-300", ring: "#F59E0B" },
  it: { accent: "#8B5CF6", soft: "bg-violet-500/10", text: "text-violet-300", ring: "#8B5CF6" },
  "role fit": { accent: "#06B6D4", soft: "bg-cyan-500/10", text: "text-cyan-300", ring: "#06B6D4" },
  default: { accent: "#6366F1", soft: "bg-indigo-500/10", text: "text-indigo-300", ring: "#6366F1" },
};

const themeFor = (category) => CATEGORY_THEME[(category || "").toLowerCase()] || CATEGORY_THEME.default;

const recommendations = [
  { label: "Priority", text: "Finish required modules before optional tool setup so your day-one access stays on track." },
  { label: "Safety", text: "Reporting to a plant? Revisit emergency, gate, and PPE guidance before travel." },
  { label: "IT", text: "List software, VPN, and device questions so IT can resolve them in one pass." },
  { label: "Role fit", text: "Prioritize modules linked to your department, then use the rest to close gaps." },
];

// A module is a "video" if it has a video source or an explicit type.
// Everything else (pdf, doc, slides, links) is tracked with a manual check.
const isVideoModule = (module) =>
  module.type === "video" || Boolean(module.video_url) || /\.(mp4|webm|mov)$/i.test(module.file_url || "");

export default function Learning() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    learningApi
      .listModules()
      .then((r) => setModules(r.data?.modules ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  // Shared progress writer — used both for the "mark reviewed" checkbox
  // and for incremental video watch-time updates.
  const updateModuleProgress = async (moduleId, progress) => {
    setUpdating(moduleId);
    setError("");
    try {
      await learningApi.updateProgress({ moduleId, progress });
      setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, progress } : m)));
    } catch {
      setError("Failed to update progress.");
    } finally {
      setUpdating(null);
    }
  };

  const stats = useMemo(() => {
    const completed = modules.filter((m) => (m.progress ?? 0) >= 100).length;
    const required = modules.filter((m) => Boolean(m.required)).length;
    const average = modules.length
      ? Math.round(modules.reduce((sum, m) => sum + (m.progress ?? 0), 0) / modules.length)
      : 0;
    return { completed, required, average };
  }, [modules]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl space-y-8">
      {/* Header with overall progress ring — the one signature element */}
      <div className="flex flex-col gap-6 rounded-2xl bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-900 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Learning Center</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Learning Modules</h2>
          <p className="mt-1 text-sm text-gray-400">
            {stats.completed}/{modules.length} completed · {stats.required} required
          </p>
        </div>
        <ProgressRing percent={stats.average} />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {modules.length === 0 ? (
        <p className="text-sm text-gray-500">No learning modules yet.</p>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {modules.map((module) =>
            isVideoModule(module) ? (
              <VideoModuleCard
                key={module.id}
                module={module}
                updating={updating === module.id}
                onProgress={(pct) => updateModuleProgress(module.id, pct)}
              />
            ) : (
              <DocModuleCard
                key={module.id}
                module={module}
                updating={updating === module.id}
                onToggleComplete={() => updateModuleProgress(module.id, 100)}
              />
            )
          )}
        </section>
      )}

      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Suggested next</h3>
          <Badge color="blue">Personalized</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendations.map((item) => {
            const theme = themeFor(item.label);
            return (
              <div key={item.text} className={`rounded-xl border border-gray-800 p-4 ${theme.soft}`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${theme.text}`}>{item.label}</span>
                <p className="mt-2 text-sm leading-6 text-gray-300">{item.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Overall progress ring ---------------------------------------------
function ProgressRing({ percent }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, percent) / 100) * circumference;

  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#1F2937" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-lg font-bold text-white">{percent}%</span>
    </div>
  );
}

// --- Video module: progress is driven by actual watch time -------------
function VideoModuleCard({ module, onProgress, updating }) {
  const videoRef = useRef(null);
  const [watchPercent, setWatchPercent] = useState(module.progress ?? 0);
  const lastSentRef = useRef(module.progress ?? 0);
  const theme = themeFor(module.category);
  const isComplete = watchPercent >= 100;

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    // Progress only ever moves forward — skipping ahead doesn't count as watching.
    const percent = Math.min(100, Math.round((el.currentTime / el.duration) * 100));
    setWatchPercent((prev) => Math.max(prev, percent));
  };

  const flushProgress = () => {
    const finalPercent = watchPercent >= 95 ? 100 : watchPercent;
    if (finalPercent !== lastSentRef.current) {
      lastSentRef.current = finalPercent;
      onProgress(finalPercent);
    }
  };

  return (
    <div
      className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900"
      style={{ borderTopColor: theme.accent, borderTopWidth: 3 }}
    >
      <div className="relative aspect-video bg-black">
        {module.video_url || module.file_url ? (
          <video
            ref={videoRef}
            className="h-full w-full"
            src={module.video_url || module.file_url}
            controls
            onTimeUpdate={handleTimeUpdate}
            onPause={flushProgress}
            onEnded={flushProgress}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-gray-500">No video available</div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className={`text-xs font-semibold uppercase tracking-wide ${theme.text}`}>
            {module.category || "Video"}
          </span>
          {module.required ? <Badge color="blue">Required</Badge> : <Badge color="gray">Optional</Badge>}
        </div>
        <h3 className="mt-2 text-base font-semibold text-white">{module.title}</h3>
        {module.description ? (
          <p className="mt-1 text-sm leading-6 text-gray-400">{module.description}</p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${watchPercent}%`, backgroundColor: theme.accent }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-semibold text-gray-400">{watchPercent}%</span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">Tracked by watch time</span>
          {isComplete ? (
            <Badge color="green">Watched</Badge>
          ) : updating ? (
            <span className="text-xs text-gray-500">Saving…</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// --- Document / PDF module: manual "mark as reviewed" checkbox ---------
function DocModuleCard({ module, onToggleComplete, updating }) {
  const theme = themeFor(module.category);
  const isComplete = (module.progress ?? 0) >= 100;

  return (
    <div
      className="flex items-start gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-4"
      style={{ borderLeftColor: theme.accent, borderLeftWidth: 4 }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isComplete}
        disabled={isComplete || updating}
        onClick={onToggleComplete}
        className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors ${
          isComplete
            ? "border-emerald-500 bg-emerald-500"
            : "border-gray-600 bg-transparent hover:border-gray-400"
        }`}
      >
        {isComplete ? (
          <svg viewBox="0 0 16 16" className="h-4 w-4 fill-white">
            <path d="M6.5 11.5 3 8l1.06-1.06 2.44 2.44 5.44-5.44L13 5 6.5 11.5z" />
          </svg>
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <span className={`text-xs font-semibold uppercase tracking-wide ${theme.text}`}>
            {module.category || "Document"}
          </span>
          {module.required ? <Badge color="blue">Required</Badge> : <Badge color="gray">Optional</Badge>}
        </div>
        <h3 className="mt-2 text-base font-semibold text-white">{module.title}</h3>
        {module.description ? (
          <p className="mt-1 text-sm leading-6 text-gray-400">{module.description}</p>
        ) : null}

        <div className="mt-3 flex items-center gap-3">
          {module.file_url ? (
            <a
              className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
              href={module.file_url}
              rel="noreferrer"
              target="_blank"
            >
              Open document
            </a>
          ) : null}
          <span className="text-xs text-gray-500">
            {isComplete ? "Marked reviewed" : updating ? "Saving…" : "Check the box once reviewed"}
          </span>
        </div>
      </div>
    </div>
  );
}