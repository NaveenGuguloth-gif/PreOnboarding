export function Button({ children, variant = "primary", loading, className = "", ...props }) {
  const base = "inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:   "bg-brand-700 hover:bg-brand-600 text-white shadow-sm shadow-brand-950/30",
    secondary: "bg-gray-900 hover:bg-gray-800 text-white border border-gray-700",
    danger:    "bg-red-700 hover:bg-red-600 text-white",
    ghost:     "text-gray-300 hover:text-white hover:bg-gray-900",
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
      {label && <label className="block text-sm text-gray-200 font-medium">{label}</label>}
      <input
        className={`
          w-full bg-gray-950/80 border rounded-lg px-3.5 py-2.5 text-white text-sm
          placeholder-gray-500 outline-none transition-colors
          focus:border-brand-500 focus:ring-1 focus:ring-brand-500
          ${error ? "border-red-500" : "border-gray-700"}
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
    <div className={`surface-panel rounded-lg p-5 ${className}`}>
      {children}
    </div>
  );
}

export function ProgressBar({ value = 0, color = "bg-brand-600", className = "" }) {
  return (
    <div className={`w-full bg-gray-800 rounded-full h-2 overflow-hidden ${className}`}>
      <div
        className={`${color} h-2 rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Badge({ children, color = "gray" }) {
  const colors = {
    gray:   "bg-gray-800/80 text-gray-300 border-gray-700",
    green:  "bg-green-950/70 text-green-300 border-green-800/80",
    yellow: "bg-yellow-950/70 text-yellow-300 border-yellow-800/80",
    red:    "bg-red-950/70 text-red-300 border-red-800/80",
    blue:   "bg-brand-950/70 text-brand-200 border-brand-800/80",
  };
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 rounded-md text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}
