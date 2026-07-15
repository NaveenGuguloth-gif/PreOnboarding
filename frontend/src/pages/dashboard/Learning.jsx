import { useEffect, useMemo, useRef, useState } from "react";
import { learningApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

const CATEGORY_THEME = {
  safety: { accent: "#EF4444", soft: "bg-rose-500/10", text: "text-rose-300" },
  compliance: { accent: "#F59E0B", soft: "bg-amber-500/10", text: "text-amber-300" },
  image: { accent: "#10B981", soft: "bg-emerald-500/10", text: "text-emerald-300" },
  link: { accent: "#06B6D4", soft: "bg-cyan-500/10", text: "text-cyan-300" },
  pdf: { accent: "#F97316", soft: "bg-orange-500/10", text: "text-orange-300" },
  video: { accent: "#6366F1", soft: "bg-indigo-500/10", text: "text-indigo-300" },
  default: { accent: "#6366F1", soft: "bg-indigo-500/10", text: "text-indigo-300" },
};

const themeFor = (module) => {
  const key = (module.content_type || module.category || "").toLowerCase();
  return CATEGORY_THEME[key] || CATEGORY_THEME.default;
};

const resolveUrl = (url = "") => {
  if (!url) return "";
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
};

const contentUrl = (module) => resolveUrl(module.video_url || module.file_url || module.link_url || "");
const isVideo = (module) =>
  module.content_type === "video" || Boolean(module.video_url) || /\.(mp4|webm|mov)$/i.test(module.file_url || "");
const isImage = (module) =>
  module.content_type === "image" || /\.(png|jpe?g|gif|webp)$/i.test(module.file_url || "");
const isPdf = (module) => module.content_type === "pdf" || /\.pdf$/i.test(module.file_url || "");
const isLink = (module) => module.content_type === "link" || Boolean(module.link_url);

export default function Learning() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeVideo, setActiveVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState("");
  const candidateId = user?.id ?? user?.employeeId ?? user?.employee_id ?? "demo";

  const load = () =>
    learningApi
      .listModules(candidateId)
      .then((r) => setModules(r.data?.modules ?? r.data ?? []))
      .catch(() => setError("Unable to load learning content."))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [candidateId]);

  const updateProgress = async (moduleId, progress) => {
    setUpdating(moduleId);
    setError("");
    try {
      await learningApi.updateProgress({ moduleId, progress }, candidateId);
      setModules((prev) => prev.map((item) => (item.id === moduleId ? { ...item, progress } : item)));
    } catch {
      setError("Failed to update progress.");
    } finally {
      setUpdating(null);
    }
  };

  const videos = useMemo(() => modules.filter(isVideo), [modules]);
  const resources = useMemo(() => modules.filter((module) => !isVideo(module)), [modules]);
  const featured = videos[0] ?? modules[0] ?? null;
  const filteredModules = useMemo(() => {
    if (activeFilter === "all") return modules;
    if (activeFilter === "video") return videos;
    return modules.filter((module) => (module.content_type || "").toLowerCase() === activeFilter);
  }, [activeFilter, modules, videos]);

  const stats = useMemo(() => {
    const completed = modules.filter((module) => (module.progress ?? 0) >= 100).length;
    const average = modules.length
      ? Math.round(modules.reduce((sum, module) => sum + (module.progress ?? 0), 0) / modules.length)
      : 0;
    return { completed, average };
  }, [modules]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="w-full space-y-8">
      {error ? (
        <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {featured ? (
        <HeroModule
          module={featured}
          progress={stats.average}
          total={modules.length}
          completed={stats.completed}
          onWatch={() => (isVideo(featured) ? setActiveVideo(featured) : openResource(featured, updateProgress))}
        />
      ) : (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-gray-400">
          No learning content has been published by HR yet.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["video", "Videos"],
          ["pdf", "PDFs"],
          ["image", "Images"],
          ["link", "Links"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveFilter(id)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              activeFilter === id
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-800 bg-gray-950/60 text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ContentRow
        title="Continue learning"
        modules={filteredModules}
        updating={updating}
        onWatch={(module) => setActiveVideo(module)}
        onOpen={(module) => openResource(module, updateProgress)}
      />

      {resources.length ? (
        <ContentRow
          title="Reference library"
          modules={resources}
          updating={updating}
          onWatch={(module) => setActiveVideo(module)}
          onOpen={(module) => openResource(module, updateProgress)}
        />
      ) : null}

      {activeVideo ? (
        <StreamingPlayer
          module={activeVideo}
          related={videos.filter((module) => module.id !== activeVideo.id)}
          updating={updating === activeVideo.id}
          onClose={() => setActiveVideo(null)}
          onProgress={(progress) => updateProgress(activeVideo.id, progress)}
          onSelectRelated={(module) => setActiveVideo(module)}
        />
      ) : null}
    </div>
  );
}

function HeroModule({ module, progress, total, completed, onWatch }) {
  const theme = themeFor(module);
  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-950">
      <div className="absolute inset-0 opacity-40">
        <Thumbnail module={module} className="h-full w-full" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/85 to-gray-950/20" />
      <div className="relative grid min-h-[360px] items-end gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:p-8">
        <div className="max-w-3xl">
          <span className={`inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide ${theme.text} ${theme.soft}`}>
            {module.content_type || "Learning"}
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{module.title}</h2>
          {module.description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">{module.description}</p> : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onWatch}
              className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-gray-950 transition hover:bg-gray-200"
            >
              {isVideo(module) ? "Watch" : "Open"}
            </button>
            {module.required ? <Badge color="blue">Required</Badge> : <Badge color="gray">Optional</Badge>}
            <span className="text-sm text-gray-400">{module.duration_minutes ?? 15} min</span>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-950/80 p-4">
          <p className="text-sm text-gray-400">Learning progress</p>
          <strong className="mt-2 block text-3xl text-white">{progress}%</strong>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-xs text-gray-500">{completed}/{total} completed</p>
        </div>
      </div>
    </section>
  );
}

function ContentRow({ title, modules, updating, onWatch, onOpen }) {
  if (!modules.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="text-sm text-gray-500">{modules.length} items</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3">
        {modules.map((module) => (
          <LearningCard
            key={module.id}
            module={module}
            updating={updating === module.id}
            onWatch={() => onWatch(module)}
            onOpen={() => onOpen(module)}
          />
        ))}
      </div>
    </section>
  );
}

function LearningCard({ module, updating, onWatch, onOpen }) {
  const theme = themeFor(module);
  const complete = (module.progress ?? 0) >= 100;
  return (
    <article className="w-[260px] shrink-0 overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition hover:-translate-y-1 hover:border-gray-700">
      <div className="relative aspect-video bg-gray-950">
        <Thumbnail module={module} className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
          <button
            type="button"
            onClick={isVideo(module) ? onWatch : onOpen}
            className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-950 transition hover:bg-gray-200"
          >
            {isVideo(module) ? "Watch" : "Open"}
          </button>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wide ${theme.text}`}>{module.content_type || "Learning"}</span>
          {complete ? <Badge color="green">Done</Badge> : module.required ? <Badge color="blue">Required</Badge> : null}
        </div>
        <div>
          <h4 className="line-clamp-2 text-sm font-semibold text-white">{module.title}</h4>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">{module.description || "HR-published learning content."}</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
          <div className="h-full rounded-full" style={{ width: `${module.progress ?? 0}%`, backgroundColor: theme.accent }} />
        </div>
        {updating ? <p className="text-xs text-gray-500">Saving...</p> : null}
      </div>
    </article>
  );
}

function Thumbnail({ module, className = "" }) {
  if (isImage(module) && contentUrl(module)) {
    return <img src={contentUrl(module)} alt="" className={`object-cover ${className}`} />;
  }

  if (isVideo(module) && contentUrl(module)) {
    return (
      <video
        src={contentUrl(module)}
        muted
        preload="metadata"
        className={`object-cover ${className}`}
      />
    );
  }

  const label = isPdf(module) ? "PDF" : isLink(module) ? "LINK" : "LEARN";
  return (
    <div className={`grid place-items-center bg-gradient-to-br from-gray-800 to-gray-950 ${className}`}>
      <span className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold tracking-widest text-gray-300">{label}</span>
    </div>
  );
}

function StreamingPlayer({ module, related, updating, onClose, onProgress, onSelectRelated }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [speed, setSpeed] = useState(1);
  const [watchPercent, setWatchPercent] = useState(module.progress ?? 0);
  const lastSentRef = useRef(module.progress ?? 0);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setWatchPercent(module.progress ?? 0);
    lastSentRef.current = module.progress ?? 0;
  }, [module.id, module.progress]);

  const flushProgress = (value = watchPercent) => {
    const finalPercent = value >= 95 ? 100 : value;
    if (finalPercent !== lastSentRef.current) {
      lastSentRef.current = finalPercent;
      onProgress(finalPercent);
    }
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().then(() => setPlaying(true)).catch(() => {});
    else {
      el.pause();
      setPlaying(false);
    }
  };

  const seek = (value) => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    el.currentTime = (Number(value) / 100) * el.duration;
  };

  const skip = (seconds) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + seconds), el.duration || el.currentTime + seconds);
  };

  const updateVolume = (value) => {
    const next = Number(value);
    setVolume(next);
    if (videoRef.current) videoRef.current.volume = next;
  };

  const updateSpeed = (value) => {
    const next = Number(value);
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  const fullscreen = () => {
    if (playerRef.current?.requestFullscreen) playerRef.current.requestFullscreen();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 px-4 py-6 backdrop-blur sm:py-10">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl">
        <div ref={playerRef} className="relative mx-auto bg-black">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/70 px-3 py-2 text-sm font-bold text-white hover:bg-black"
            aria-label="Close player"
          >
            Close
          </button>
          <video
            ref={videoRef}
            src={contentUrl(module)}
            className="mx-auto aspect-video max-h-[56vh] w-full bg-black object-contain"
            onLoadedMetadata={(event) => {
              setDuration(event.currentTarget.duration || 0);
              event.currentTarget.volume = volume;
              event.currentTarget.playbackRate = speed;
            }}
            onTimeUpdate={(event) => {
              const el = event.currentTarget;
              setCurrentTime(el.currentTime);
              setDuration(el.duration || 0);
              const pct = el.duration ? Math.min(100, Math.round((el.currentTime / el.duration) * 100)) : 0;
              setWatchPercent((prev) => Math.max(prev, pct));
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => {
              setPlaying(false);
              flushProgress();
            }}
            onEnded={() => {
              setPlaying(false);
              setWatchPercent(100);
              flushProgress(100);
            }}
          />
          <div className="space-y-3 border-t border-gray-900 bg-gray-950 p-3 sm:p-4">
            <input
              type="range"
              min="0"
              max="100"
              value={duration ? Math.round((currentTime / duration) * 100) : 0}
              onChange={(event) => seek(event.target.value)}
              className="w-full accent-indigo-500"
              aria-label="Video progress"
            />
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-300">
              <button type="button" onClick={togglePlay} className="h-10 rounded-lg bg-white px-4 font-bold text-gray-950">
                {playing ? "Pause" : "Play"}
              </button>
              <button type="button" onClick={() => skip(-10)} className="h-10 rounded-lg border border-gray-700 px-3 font-semibold">-10s</button>
              <button type="button" onClick={() => skip(10)} className="h-10 rounded-lg border border-gray-700 px-3 font-semibold">+10s</button>
              <span className="min-w-28 text-gray-400">{formatTime(currentTime)} / {formatTime(duration)}</span>
              <label className="flex items-center gap-2">
                <span>Volume</span>
                <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => updateVolume(event.target.value)} className="w-24 accent-indigo-500" />
              </label>
              <select value={speed} onChange={(event) => updateSpeed(event.target.value)} className="h-10 rounded-lg border border-gray-700 bg-gray-950 px-2 text-white">
                {[0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}x</option>)}
              </select>
              <button type="button" onClick={fullscreen} className="h-10 rounded-lg border border-gray-700 px-3 font-semibold">Fullscreen</button>
              {updating ? <span className="text-xs text-gray-500">Saving...</span> : null}
            </div>
          </div>
        </div>

        <div className="space-y-6 p-4 sm:p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-bold text-white">{module.title}</h3>
              {module.required ? <Badge color="blue">Required</Badge> : <Badge color="gray">Optional</Badge>}
            </div>
            {module.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">{module.description}</p> : null}
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 max-w-sm flex-1 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${watchPercent}%` }} />
              </div>
              <span className="text-xs font-semibold text-gray-400">{watchPercent}% watched</span>
            </div>
          </div>

          <section>
            <h4 className="text-lg font-semibold text-white">Related learning videos</h4>
            {related.length ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {related.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectRelated(item)}
                    className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900 text-left transition hover:-translate-y-1 hover:border-gray-700"
                  >
                    <div className="aspect-video bg-gray-950">
                      <Thumbnail module={item} className="h-full w-full" />
                    </div>
                    <div className="p-3">
                      <h5 className="line-clamp-2 text-sm font-semibold text-white">{item.title}</h5>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">{item.description || "HR-published learning video."}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No other HR-published videos are available yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function openResource(module, updateProgress) {
  const url = contentUrl(module);
  if (url) window.open(url, "_blank", "noreferrer");
  updateProgress(module.id, 100);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}
