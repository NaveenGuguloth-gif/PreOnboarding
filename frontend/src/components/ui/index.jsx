export function Button({ children, variant = "primary", loading, className = "", ...props }) {
  const base = "inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0";
  const variants = {
    primary:   "bg-brand-700 hover:bg-brand-600 text-white shadow-[0_8px_20px_rgba(75,31,166,0.25)]",
    secondary: "bg-white hover:bg-brand-50 text-slate-900 border border-slate-200 shadow-sm",
    danger:    "bg-red-600 hover:bg-red-500 text-white shadow-[0_8px_20px_rgba(220,38,38,0.18)]",
    ghost:     "text-slate-600 hover:text-brand-700 hover:bg-brand-50",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? "Loading…" : children}
    </button>
  );
}

export function Input({ label, error, className = "", ...props }) {
  return (
    <div className="space-y-2">
      {label && <label className="block text-sm text-slate-700 font-semibold">{label}</label>}
      <input
        className={`
          w-full bg-white border rounded-xl px-3.5 py-2.5 text-slate-900 text-sm
          placeholder-slate-400 outline-none transition-all
          focus:border-brand-600 focus:ring-4 focus:ring-brand-100
          ${error ? "border-red-400" : "border-slate-200"}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`surface-panel rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] ${className}`}>
      {children}
    </div>
  );
}

export function ProgressBar({ value = 0, color = "bg-brand-600", className = "" }) {
  return (
    <div className={`w-full bg-slate-100 rounded-full h-2.5 overflow-hidden ${className}`}>
      <div
        className={`${color} h-2.5 rounded-full bg-gradient-to-r from-brand-700 to-brand-500 transition-all duration-700 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Badge({ children, color = "gray" }) {
  const colors = {
    gray:   "bg-slate-100 text-slate-600 border-slate-200",
    green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    red:    "bg-red-50 text-red-700 border-red-200",
    blue:   "bg-brand-50 text-brand-700 border-brand-100",
  };
  return (
    <span className={`inline-flex items-center border px-2.5 py-1 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}
