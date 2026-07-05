import { useEffect, useMemo, useState } from "react";
import { relocationApi } from "../../services/api";
import { Badge } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

// Category accents, reused across the finder pills, insight rows,
// and resource card borders so the whole page shares one color language.
const CATEGORY_THEME = {
  apartments: { accent: "#8B5CF6", soft: "bg-violet-500/10", text: "text-violet-300" },
  "nearby hospitals": { accent: "#EF4444", soft: "bg-rose-500/10", text: "text-rose-300" },
  "nearby gyms": { accent: "#A3E635", soft: "bg-lime-500/10", text: "text-lime-300" },
  "daily essentials": { accent: "#F97316", soft: "bg-orange-500/10", text: "text-orange-300" },
  accommodation: { accent: "#8B5CF6", soft: "bg-violet-500/10", text: "text-violet-300" },
  housing: { accent: "#8B5CF6", soft: "bg-violet-500/10", text: "text-violet-300" },
  transport: { accent: "#06B6D4", soft: "bg-cyan-500/10", text: "text-cyan-300" },
  health: { accent: "#EF4444", soft: "bg-rose-500/10", text: "text-rose-300" },
  hospitals: { accent: "#EF4444", soft: "bg-rose-500/10", text: "text-rose-300" },
  fitness: { accent: "#A3E635", soft: "bg-lime-500/10", text: "text-lime-300" },
  gyms: { accent: "#A3E635", soft: "bg-lime-500/10", text: "text-lime-300" },
  banking: { accent: "#10B981", soft: "bg-emerald-500/10", text: "text-emerald-300" },
  education: { accent: "#F59E0B", soft: "bg-amber-500/10", text: "text-amber-300" },
  essentials: { accent: "#F97316", soft: "bg-orange-500/10", text: "text-orange-300" },
  default: { accent: "#6366F1", soft: "bg-indigo-500/10", text: "text-indigo-300" },
};

const themeFor = (category) => CATEGORY_THEME[(category || "").toLowerCase()] || CATEGORY_THEME.default;

const CATEGORY_META = {
  apartments: {
    symbol: "⌂",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
  },
  "nearby hospitals": {
    symbol: "+",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80",
  },
  "nearby gyms": {
    symbol: "◧",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
  },
  "daily essentials": {
    symbol: "◼",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
  },
  transport: {
    symbol: "→",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
  },
  default: {
    symbol: "•",
    image: "https://images.unsplash.com/photo-1524230572899-a752b3835840?auto=format&fit=crop&w=900&q=80",
  },
};

function normalizeRelocationCategory(category = "", title = "") {
  const value = `${category} ${title}`.toLowerCase();

  if (value.includes("apartment") || value.includes("pg") || value.includes("hostel") || value.includes("hotel") || value.includes("stay") || value.includes("housing") || value.includes("accommodation")) {
    return "Apartments";
  }
  if (value.includes("hospital") || value.includes("clinic") || value.includes("health")) {
    return "Nearby Hospitals";
  }
  if (value.includes("gym") || value.includes("fitness")) {
    return "Nearby Gyms";
  }
  if (value.includes("grocery") || value.includes("pharmacy") || value.includes("essential") || value.includes("store") || value.includes("market")) {
    return "Daily Essentials";
  }
  if (value.includes("transport") || value.includes("station") || value.includes("bus") || value.includes("metro") || value.includes("commute") || value.includes("shuttle")) {
    return "Transport";
  }

  return category || "Other Nearby Places";
}

function categoryMetaFor(category) {
  return CATEGORY_META[(category || "").toLowerCase()] || CATEGORY_META.default;
}

const insightData = {
  expensePlan: [
    { icon: "01", title: "Temporary stay", meta: "7-14 days", description: "Keep a short-stay buffer while you inspect longer-term housing near the plant." },
    { icon: "02", title: "Initial deposits", meta: "High priority", description: "Plan for rental deposit, local travel, meals, and document photocopies in the first week." },
    { icon: "03", title: "Reimbursements", meta: "Save proofs", description: "Preserve invoices for eligible relocation expenses and upload them when HR requests them." },
  ],
  commutePlanner: [
    { icon: "A", title: "Plant shuttle", meta: "Most reliable", description: "Use the scheduled shuttle during your first week while you learn gate and shift timings." },
    { icon: "B", title: "Rail plus auto", meta: "Budget route", description: "Pimpri station is the closest rail connection for regular commuting into the plant area." },
    { icon: "C", title: "Cab pooling", meta: "Flexible", description: "Good for late reporting slots, airport arrivals, or days when documents must be carried." },
  ],
  survivalGuide: [
    { icon: "ID", title: "Carry originals", meta: "Day one", description: "Keep government ID, education proofs, joining letter, and passport photos together." },
    { icon: "SIM", title: "Local setup", meta: "First 48 hrs", description: "Confirm mobile connectivity, local address proof needs, nearby ATM, and emergency contacts." },
    { icon: "MED", title: "Health access", meta: "Nearby", description: "Save clinic, pharmacy, and plant medical desk contacts before your reporting day." },
  ],
  costInsights: [
    { icon: "R", title: "Rent range", meta: "Varies by area", description: "Akurdi, Nigdi, and Pimpri are practical first-month options near the plant." },
    { icon: "F", title: "Food and basics", meta: "Daily spend", description: "Budget separately for meals, laundry, commute, and small setup purchases." },
    { icon: "S", title: "Setup reserve", meta: "Recommended", description: "Keep a reserve for security deposits, bedding, cookware, and local transport passes." },
  ],
};

const generatedResourcesFor = (location) => {
  const area = location?.trim() || "your preferred area";
  return [
    {
      id: "stay-apartment-search",
      category: "Accommodation",
      title: `Apartments and PGs near ${area}`,
      description: "Shortlist furnished apartments, PG stays, and shared flats for the first month.",
      address: `${area} residential area`,
      contact: "Ask HR travel desk for verified brokers",
      distance_km: 1.5,
    },
    {
      id: "stay-hospital-search",
      category: "Health",
      title: `Hospitals and clinics near ${area}`,
      description: "Keep nearby emergency care, pharmacy, and general physician contacts saved.",
      address: `${area} main road`,
      contact: "Local emergency desk / nearby clinic",
      distance_km: 2.1,
    },
    {
      id: "stay-gym-search",
      category: "Fitness",
      title: `Gyms and fitness centers near ${area}`,
      description: "Look for monthly memberships, early-morning access, and locker facilities.",
      address: `${area} market cluster`,
      contact: "Visit shortlisted gyms before paying",
      distance_km: 1.2,
    },
    {
      id: "stay-essentials-search",
      category: "Essentials",
      title: `Groceries and pharmacy near ${area}`,
      description: "Find daily groceries, medical stores, laundry, and basic household supplies.",
      address: `${area} local market`,
      contact: "Save two delivery and pharmacy options",
      distance_km: 0.8,
    },
    {
      id: "stay-commute-search",
      category: "Transport",
      title: `Commute options from ${area}`,
      description: "Compare shuttle pickup, bus/rail access, cab pooling, and first-week commute time.",
      address: `${area} commute corridor`,
      contact: "transport.support@tatamotors.com",
      distance_km: 3.2,
    },
  ];
};

export default function Relocation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stayLocation, setStayLocation] = useState("");
  const [relocationForm, setRelocationForm] = useState({
    destination_city: "",
  });
  const [aiResources, setAiResources] = useState([]);
  const [aiSource, setAiSource] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    relocationApi
      .get()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRelocationSearch = (event) => {
    event.preventDefault();
    const location = relocationForm.destination_city.trim();
    if (location.length < 2) {
      setAiResources([]);
      setAiSource("");
      setAiLoading(false);
      return;
    }

    setStayLocation(location);
    setAiLoading(true);
    relocationApi
      .search({ location })
      .then((res) => {
        setAiResources(res.data?.resources ?? []);
        setAiSource(res.data?.source ?? "");
      })
      .catch(() => {
        setAiResources(generatedResourcesFor(location));
        setAiSource("fallback");
      })
      .finally(() => setAiLoading(false));
  };

  const resources = useMemo(
    () => [...(data?.resources ?? []), ...(aiResources.length ? aiResources : generatedResourcesFor(stayLocation || data?.location))],
    [aiResources, data?.location, data?.resources, stayLocation]
  );

  const grouped = useMemo(
    () =>
      resources.reduce((acc, resource) => {
        const groupName = normalizeRelocationCategory(resource.category, resource.title);
        acc[groupName] = acc[groupName] ?? [];
        acc[groupName].push({ ...resource, category: groupName });
        return acc;
      }, {}),
    [resources]
  );

  if (loading) return <LoadingSpinner />;

  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-gray-400">
        No relocation data available.
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:flex sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Local support</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Relocation Support</h2>
          <p className="mt-1 text-sm text-gray-400">Search a location and see nearby apartments, hospitals, gyms, transport, and essentials.</p>
        </div>
        <Badge color="blue">{resources.length} nearby resources</Badge>
      </div>

      <SmartRelocationFinder
        location={data.location}
        relocationForm={relocationForm}
        setRelocationForm={setRelocationForm}
        stayLocation={stayLocation}
        aiLoading={aiLoading}
        aiSource={aiSource}
        onSearch={handleRelocationSearch}
        resultCount={resources.length}
      />

      <section className="space-y-4">
        {Object.entries(grouped).map(([groupName, items]) => (
          <RelocationCategorySection key={groupName} groupName={groupName} items={items} />
        ))}

        {resources.length === 0 && (
          <p className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-sm text-gray-400">
            No relocation resources match your search.
          </p>
        )}
      </section>
    </div>
  );
}

function SmartRelocationFinder({ aiLoading, aiSource, location, onSearch, relocationForm, resultCount, setRelocationForm, stayLocation }) {
  const set = (key) => (event) => setRelocationForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge color="blue">Smart finder</Badge>
          <h3 className="mt-3 text-xl font-semibold text-white">AI relocation search for {stayLocation || location}</h3>
          <p className="mt-1 text-sm text-gray-400">Enter a location to get relocation options with name, location, contact, and distance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {aiLoading ? <Badge color="yellow">AI searching</Badge> : null}
          {aiSource ? <Badge color={aiSource === "llm" ? "green" : "gray"}>{aiSource === "llm" ? "OpenAI results" : "Fallback results"}</Badge> : null}
          <Badge color="gray">{resultCount} matching</Badge>
        </div>
      </div>

      <form onSubmit={onSearch} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={relocationForm.destination_city}
          onChange={set("destination_city")}
          placeholder="Enter location"
          className="min-h-12 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={aiLoading}
          className="min-h-12 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
        >
          {aiLoading ? "Searching..." : "Search"}
        </button>
      </form>

    </section>
  );
}

function RelocationCategorySection({ groupName, items }) {
  const theme = themeFor(groupName);
  const meta = categoryMetaFor(groupName);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
      <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
        <div className="relative min-h-48 overflow-hidden border-b border-gray-800 lg:border-b-0 lg:border-r">
          <img
            alt={`${groupName} preview`}
            className="absolute inset-0 h-full w-full object-cover"
            src={meta.image}
          />
          <div className="absolute inset-0 bg-gray-950/65" />
          <div className="relative flex h-full min-h-48 flex-col justify-between p-5">
            <span
              className="grid h-12 w-12 place-items-center rounded-lg text-2xl"
              style={{ backgroundColor: `${theme.accent}24`, color: theme.accent }}
            >
              {meta.symbol}
            </span>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${theme.text}`}>Nearby category</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">{groupName}</h3>
              <p className="mt-2 text-sm text-gray-300">{items.length} options found</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((resource) => (
            <RelocationResultCard
              key={resource.id ?? resource.title ?? resource.name}
              resource={resource}
              symbol={meta.symbol}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function RelocationResultCard({ resource, symbol, theme }) {
  const title = resource.title ?? resource.name ?? "Not Available";
  const distance = resource.distance ?? (resource.distance_km != null ? `${resource.distance_km} km` : "Not Available");

  return (
    <article className="flex min-h-52 flex-col rounded-lg border border-gray-800 bg-gray-950/70 p-4 transition hover:border-gray-700">
      <div className="flex items-start justify-between gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xl"
          style={{ backgroundColor: `${theme.accent}1F`, color: theme.accent }}
        >
          {symbol}
        </span>
        <span className="rounded-full border border-gray-800 px-2.5 py-1 text-xs text-gray-400">{distance}</span>
      </div>
      <strong className="mt-4 line-clamp-2 text-base font-semibold text-white">{title}</strong>
      {resource.description ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-400">{resource.description}</p> : null}
      <div className="mt-auto space-y-2 pt-4 text-sm text-gray-400">
        <p className="line-clamp-2">
          <span className="text-gray-500">Area: </span>
          {resource.address || "Not Available"}
        </p>
        <p className="line-clamp-2">
          <span className="text-gray-500">Contact: </span>
          {resource.contact || "Not Available"}
        </p>
      </div>
    </article>
  );
}

function RelocationTables({ additionalInsights, bestChoice, categories, summary }) {
  const summaryData = typeof summary === "object" && summary ? summary : {};
  const overview = typeof summary === "string" ? summary : summaryData.overview;
  const bestEntries = Object.entries(bestChoice ?? {}).filter(([, value]) => value);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-xl font-semibold text-white">Relocation Summary</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <SummaryItem label="Destination" value={summaryData.destination} />
          <SummaryItem label="Source" value="OpenAI relocation search" />
        </div>
        {overview ? <p className="mt-4 text-sm leading-6 text-gray-400">{overview}</p> : null}
      </div>

      {categories.map((section) => (
        <div key={section.key ?? section.title} className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
            <h3 className="text-lg font-semibold text-white">{section.title}</h3>
            <span className="text-sm text-gray-500">Results</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-950/60 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  {(section.columns ?? []).map((column) => (
                    <th key={column} className="px-4 py-3">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {(section.items ?? []).map((item, index) => (
                  <tr key={`${section.key}-${index}`} className="hover:bg-gray-950/40">
                    {(section.columns ?? []).map((column) => (
                      <td key={column} className="px-4 py-3 text-gray-300">
                        {item[column] ?? item[column.toLowerCase()] ?? "Not Available"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {(bestEntries.length > 0 || additionalInsights?.length > 0) && (
        <div className="grid gap-4 xl:grid-cols-2">
          {bestEntries.length > 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="text-lg font-semibold text-white">Suggested Best Choice</h3>
              <div className="mt-4 grid gap-2">
                {bestEntries.map(([key, value]) => (
                  <p key={key} className="text-sm text-gray-300">
                    <span className="font-semibold text-gray-500">{key.replace(/_/g, " ")}:</span> {value}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {additionalInsights?.length > 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="text-lg font-semibold text-white">Additional Insights</h3>
              <div className="mt-4 grid gap-2">
                {additionalInsights.map((item) => (
                  <p key={item} className="text-sm leading-6 text-gray-300">{item}</p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value || "Not Available"}</p>
    </div>
  );
}

function InsightSection({ eyebrow, items, title, accent }) {
  return (
    <RelocationPanel accent={accent}>
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>
        {eyebrow}
      </span>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h3>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <RelocationMiniRow key={item.title} accent={accent} {...item} />
        ))}
      </div>
    </RelocationPanel>
  );
}

function RelocationMiniRow({ accent, description, icon, meta, title }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold"
          style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-white">{title}</strong>
            {meta ? <Badge color="gray">{meta}</Badge> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ResourceRow({ resource, theme }) {
  const title = resource.title ?? resource.name;

  return (
    <article className="flex gap-4 px-5 py-4 transition hover:bg-gray-950/50">
      <img
        alt={`${title} preview`}
        className="h-16 w-20 shrink-0 rounded-lg object-cover sm:h-20 sm:w-28"
        src={getRelocationImage(resource.category, title)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <strong className="block truncate text-base font-semibold text-white">{title}</strong>
            {resource.description ? <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-400">{resource.description}</p> : null}
          </div>
          {resource.distance_km != null ? (
            <span className="shrink-0 rounded-full border border-gray-800 px-2.5 py-1 text-xs text-gray-400">
              {resource.distance_km} km
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          {resource.address ? <span className="line-clamp-1">Address: {resource.address}</span> : null}
          {resource.contact ? <span className="line-clamp-1">Contact: {resource.contact}</span> : null}
        </div>
      </div>
    </article>
  );
}

function RelocationPanel({ accent, children }) {
  return (
    <div
      className="rounded-2xl border border-gray-800 bg-gray-900 p-5"
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      {children}
    </div>
  );
}

function getRelocationImage(category = "", title = "") {
  const value = `${category} ${title}`.toLowerCase();

  if (value.includes("school") || value.includes("education")) {
    return "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=900&q=80";
  }
  if (value.includes("accommodation") || value.includes("guest") || value.includes("apartment") || value.includes("pg")) {
    return "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80";
  }
  if (value.includes("transport") || value.includes("station") || value.includes("airport") || value.includes("shuttle")) {
    return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80";
  }
  if (value.includes("health") || value.includes("hospital") || value.includes("clinic")) {
    return "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80";
  }
  if (value.includes("gym") || value.includes("fitness")) {
    return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80";
  }
  if (value.includes("grocery") || value.includes("pharmacy") || value.includes("essential")) {
    return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80";
  }
  if (value.includes("bank")) {
    return "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=900&q=80";
  }
  return "https://images.unsplash.com/photo-1524230572899-a752b3835840?auto=format&fit=crop&w=900&q=80";
}
