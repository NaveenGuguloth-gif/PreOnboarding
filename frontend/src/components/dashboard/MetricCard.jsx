export default function MetricCard({ label, value, suffix = "%", color = "brand" }) {
  const colors = {
    brand:  "bg-brand-600",
    green:  "bg-green-600",
    purple: "bg-violet-600",
    orange: "bg-amber-600",
  };

  return (
    <div className="surface-panel rounded-lg p-5">
      <div className={`mb-4 h-1 w-10 rounded-full ${colors[color] ?? colors.brand}`} />
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-white text-3xl font-semibold tracking-tight">
        {value ?? "—"}
        <span className="text-lg font-normal text-gray-500 ml-1">{suffix}</span>
      </p>
    </div>
  );
}
