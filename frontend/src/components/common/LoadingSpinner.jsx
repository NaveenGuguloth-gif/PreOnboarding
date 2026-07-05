export default function LoadingSpinner({ full = false }) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  );

  if (full) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-16">
      {spinner}
    </div>
  );
}