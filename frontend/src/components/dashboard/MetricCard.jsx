export default function MetricCard({ label, value, suffix = "%", color = "brand" }) {
  const colors = {
    brand:  "bg-brand-100 text-brand-700",
    green:  "bg-emerald-100 text-emerald-700",
    purple: "bg-violet-100 text-violet-700",
    orange: "bg-amber-100 text-amber-700",
  };
  const dots = {
    brand: "bg-brand-600",
    green: "bg-emerald-500",
    purple: "bg-violet-500",
    orange: "bg-amber-500",
  };

  return (
    <div className="surface-panel rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1">
      <div className="mb-5 flex items-center justify-between">
        <span className={`grid h-11 w-11 place-items-center rounded-full text-sm font-bold ${colors[color] ?? colors.brand}`}>
          {label?.[0] ?? "M"}
        </span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Live</span>
      </div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-slate-950">
        {value ?? "—"}
        <span className="ml-1 text-lg font-semibold text-slate-400">{suffix}</span>
      </p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full w-2/3 rounded-full ${dots[color] ?? dots.brand}`} />
      </div>
    </div>
  );
}
