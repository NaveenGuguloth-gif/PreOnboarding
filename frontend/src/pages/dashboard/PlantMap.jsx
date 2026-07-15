import { Badge } from "../../components/ui";

export default function PlantMap() {
  return (
    <div className="w-full space-y-5">
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Plant Map</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Company campus map</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-400">
              Use this dedicated map to review the Tata Motors Pune plant layout before reporting.
            </p>
          </div>
          <Badge color="blue">Campus reference</Badge>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-5 py-4">
          <h3 className="text-lg font-semibold text-white">Tata Motors Pune layout</h3>
          <p className="mt-1 text-sm text-gray-400">Zoom or scroll horizontally on smaller screens to inspect block labels and internal roads.</p>
        </div>
        <div className="overflow-auto bg-white p-3">
          <div className="min-w-[760px]">
            <img
              src="/assets/tata-motors-pune-layout.jpeg"
              alt="Tata Motors Pune plant layout map"
              className="h-auto w-full rounded-lg"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
