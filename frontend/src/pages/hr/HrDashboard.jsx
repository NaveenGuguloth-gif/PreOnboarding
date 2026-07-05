import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { hrApi } from "../../services/api";
import { Badge, Button, Input, ProgressBar } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const demoExtraCandidates = [
  {
    id: "emp-004",
    name: "Praveen",
    email: "praveen@tata.com",
    department: "Production",
    joining_date: "2026-06-05",
    readiness_score: 23,
    document_completion: 0,
  },
];

const kpiMeta = [
  { key: "avgProfileCompletion", label: "Avg Profile", icon: "U", delta: "12%", trend: "up", color: "blue" },
  { key: "avgDocumentCompletion", label: "Avg Documents", icon: "F", delta: "8%", trend: "up", color: "green" },
  { key: "avgLearningCompletion", label: "Avg Learning", icon: "L", delta: "5%", trend: "down", color: "purple" },
  { key: "avgReadinessScore", label: "Avg Readiness", icon: "S", delta: "9%", trend: "up", color: "orange" },
];

const emptyCandidate = {
  name: "",
  email: "",
  employee_id: "",
  department: "",
  role: "",
  location: "",
  joining_date: "",
  phone: "",
};

export default function HrDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Newest");
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [candidateForm, setCandidateForm] = useState(emptyCandidate);
  const [notice, setNotice] = useState("");

  const loadDashboard = () => {
    const sortMap = {
      Newest: "joining_date",
      Readiness: "readiness_score",
      Name: "name",
    };

    return Promise.all([
      hrApi.listCandidates({ search: query || undefined, sort: sortMap[sortBy] ?? "joining_date" }),
      hrApi.getAnalytics(),
    ])
      .then(([c, a]) => {
        const apiCandidates = c.data?.candidates ?? c.data ?? [];
        const existingIds = new Set(apiCandidates.map((candidate) => candidate.id));
        setCandidates([
          ...apiCandidates,
          ...demoExtraCandidates.filter((candidate) => !existingIds.has(candidate.id)),
        ]);
        setAnalytics(a.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, [query, sortBy]);

  const filteredCandidates = useMemo(() => {
    const term = query.trim().toLowerCase();
    const next = candidates.filter((candidate) => {
      if (!term) return true;
      return `${candidate.name} ${candidate.email} ${candidate.department} ${candidate.role ?? ""}`
        .toLowerCase()
        .includes(term);
    });

    return [...next].sort((a, b) => {
      if (sortBy === "Readiness") return (b.readiness_score ?? 0) - (a.readiness_score ?? 0);
      if (sortBy === "Name") return a.name.localeCompare(b.name);
      return new Date(b.joining_date) - new Date(a.joining_date);
    });
  }, [candidates, query, sortBy]);

  if (loading) return <LoadingSpinner />;

  const totalDisplay = Math.max(124, candidates.length);

  const setCandidate = (key) => (event) =>
    setCandidateForm((current) => ({ ...current, [key]: event.target.value }));

  const createCandidate = async (event) => {
    event.preventDefault();
    if (!candidateForm.name.trim() || !candidateForm.email.trim()) return;
    setSaving(true);
    setNotice("");
    try {
      await hrApi.createCandidate({
        ...candidateForm,
        employee_id: candidateForm.employee_id || `TM-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        joining_date: candidateForm.joining_date || new Date().toISOString().slice(0, 10),
        profile_completion: 60,
        document_completion: 0,
        learning_progress: 0,
        readiness_score: 20,
      });
      setCandidateForm(emptyCandidate);
      setShowAddCandidate(false);
      setNotice("Candidate added successfully.");
      await loadDashboard();
    } finally {
      setSaving(false);
    }
  };

  const deleteCandidate = async (id) => {
    await hrApi.deleteCandidate(id);
    setNotice("Candidate removed.");
    await loadDashboard();
  };

  const bulkUploadDemo = async () => {
    const batchId = Date.now().toString().slice(-4);
    await hrApi.createCandidate({
      name: `Bulk Candidate ${batchId}`,
      email: `bulk.${batchId}@tatamotors.com`,
      employee_id: `TM-2026-${batchId}`,
      department: "Production",
      role: "Graduate Engineer Trainee",
      location: "Pune Plant",
      joining_date: new Date().toISOString().slice(0, 10),
      profile_completion: 50,
      document_completion: 0,
      learning_progress: 0,
      readiness_score: 18,
    });
    setNotice("Bulk upload demo added 1 candidate.");
    await loadDashboard();
  };

  const sendReminder = () => {
    const pending = filteredCandidates.filter((candidate) => (candidate.document_completion ?? 0) < 100).length;
    setNotice(`Reminder queued for ${pending} candidate${pending === 1 ? "" : "s"} with pending documents.`);
  };

  const exportCsv = () => {
    const headers = ["Name", "Email", "Department", "Joining", "Readiness", "Documents", "Status"];
    const rows = filteredCandidates.map((candidate) => [
      candidate.name,
      candidate.email,
      candidate.department,
      candidate.joining_date,
      `${candidate.readiness_score}%`,
      `${candidate.document_completion}%`,
      candidate.readiness_score >= 90 ? "Completed" : candidate.readiness_score < 30 ? "Not Started" : "In Progress",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pre-onboarding-candidates.csv";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Candidate report downloaded.");
  };

  return (
    <div className="max-w-[1600px] space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-14 w-full rounded-lg border border-gray-800 bg-gray-950/60 pl-20 pr-14 text-sm text-white outline-none transition focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
            placeholder="by name, email, department, or role..."
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-gray-800 px-2 py-1 text-xs text-gray-500">
            ⌘ K
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ToolbarButton label={sortBy === "Readiness" ? "Clear Filter" : "Needs Attention"} icon="F" onClick={() => setSortBy(sortBy === "Readiness" ? "Newest" : "Readiness")} />
          <ToolbarButton label="01 May 2026 - 31 May 2026" icon="C" wide />
          <ToolbarButton label="Export" icon="E" onClick={exportCsv} />
        </div>
      </section>

      {notice ? (
        <div className="rounded-lg border border-green-800 bg-green-950/50 px-4 py-3 text-green-200">
          {notice}
        </div>
      ) : null}

      {showAddCandidate ? (
        <form onSubmit={createCandidate} className="rounded-xl border border-gray-800 bg-[#0b1020] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Add Candidate</h2>
            <button type="button" onClick={() => setShowAddCandidate(false)} className="text-gray-400 hover:text-white">
              Close
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="Name" value={candidateForm.name} onChange={setCandidate("name")} required />
            <Input label="Email" type="email" value={candidateForm.email} onChange={setCandidate("email")} required />
            <Input label="Employee ID" value={candidateForm.employee_id} onChange={setCandidate("employee_id")} />
            <Input label="Department" value={candidateForm.department} onChange={setCandidate("department")} />
            <Input label="Role" value={candidateForm.role} onChange={setCandidate("role")} />
            <Input label="Location" value={candidateForm.location} onChange={setCandidate("location")} />
            <Input label="Joining Date" type="date" value={candidateForm.joining_date} onChange={setCandidate("joining_date")} />
            <Input label="Phone" value={candidateForm.phone} onChange={setCandidate("phone")} />
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="submit" loading={saving}>
              Create Candidate
            </Button>
          </div>
        </form>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiMeta.map((item) => (
          <KpiCard analytics={analytics} item={item} key={item.key} />
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-800 bg-[#0b1020] shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 border-b border-gray-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">All Candidates</h2>
            <span className="rounded-full bg-brand-700/80 px-2.5 py-1 text-xs font-semibold text-white">{totalDisplay}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-sm text-gray-400">
              Sort by:
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent text-white outline-none"
              >
                <option className="bg-gray-950">Newest</option>
                <option className="bg-gray-950">Readiness</option>
                <option className="bg-gray-950">Name</option>
              </select>
            </label>
            <div className="flex overflow-hidden rounded-lg border border-gray-800">
              <button className="bg-gray-900 px-3 py-2 text-sm text-white" type="button">Grid</button>
              <button className="px-3 py-2 text-sm text-gray-500" type="button">List</button>
            </div>
          </div>
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-medium text-white">No candidates found</p>
            <p className="mt-1 text-sm text-gray-500">Try a different search term or clear the filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4 text-left">Name</th>
                  <th className="px-5 py-4 text-left">Department</th>
                  <th className="px-5 py-4 text-left">Joining</th>
                  <th className="px-5 py-4 text-left">Readiness</th>
                  <th className="px-5 py-4 text-left">Documents</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {filteredCandidates.map((candidate) => (
                  <CandidateRow
                    candidate={candidate}
                    key={candidate.id}
                    onDelete={deleteCandidate}
                    onRemind={(candidateName) => setNotice(`Reminder queued for ${candidateName}.`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-gray-800 px-5 py-4 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <span>Showing 1 to {Math.min(10, filteredCandidates.length)} of {totalDisplay} results</span>
          <div className="flex items-center gap-2">
            {["‹", "1", "2", "3", "...", "13", "›"].map((item) => (
              <button
                key={item}
                type="button"
                className={`h-9 min-w-9 rounded-lg border border-gray-800 px-3 text-sm ${
                  item === "1" ? "bg-brand-700 text-white" : "bg-gray-950/60 text-gray-400 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-[#0b1020] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <h3 className="text-base font-semibold text-white">Quick Actions</h3>
          <button type="button" onClick={() => setShowAddCandidate(true)} className="text-sm text-gray-400 transition hover:text-white">Add Candidate</button>
          <button type="button" onClick={bulkUploadDemo} className="text-sm text-gray-400 transition hover:text-white">Bulk Upload</button>
          <button type="button" onClick={sendReminder} className="text-sm text-gray-400 transition hover:text-white">Send Reminder</button>
          <button type="button" onClick={exportCsv} className="text-sm text-gray-400 transition hover:text-white">Generate Report</button>
          <button type="button" onClick={() => setSortBy("Newest")} className="text-sm text-gray-400 transition hover:text-white">View Calendar</button>
        </div>
        <button type="button" onClick={() => setShowAddCandidate(true)} className="rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600">
          + New Candidate
        </button>
      </section>
    </div>
  );
}

function ToolbarButton({ icon, label, onClick, wide = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-14 rounded-lg border border-gray-800 bg-gray-950/60 px-5 text-sm font-semibold text-white transition hover:border-gray-700 hover:bg-gray-900 ${wide ? "sm:min-w-80" : ""}`}
    >
      <span className="mr-3 text-gray-500">{icon}</span>
      {label}
    </button>
  );
}

function KpiCard({ analytics, item }) {
  const value = analytics?.[item.key] ?? 0;
  const colorMap = {
    blue: "bg-brand-700/20 text-brand-300 border-brand-800/80",
    green: "bg-green-900/30 text-green-300 border-green-800/80",
    purple: "bg-violet-900/30 text-violet-300 border-violet-800/80",
    orange: "bg-orange-900/30 text-orange-300 border-orange-800/80",
  };

  return (
    <article className="rounded-lg border border-gray-800 bg-[#0b1020] p-3 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-lg border text-xs font-bold ${colorMap[item.color]}`}>
          {item.icon}
        </span>
        <span className="text-base leading-none text-gray-500">...</span>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-gray-400">{item.label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-white">
        {value}<span className="ml-1 text-sm font-normal text-gray-400">%</span>
      </p>
      <p className="mt-2 text-xs text-gray-400">
        <span className={item.trend === "up" ? "text-green-400" : "text-red-400"}>
          {item.trend === "up" ? "↑" : "↓"} {item.delta}
        </span>{" "}
        from last month
      </p>
    </article>
  );
}

function CandidateRow({ candidate, onDelete, onRemind }) {
  const initials = candidate.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const completed = candidate.readiness_score >= 90;
  const notStarted = candidate.readiness_score < 30;

  return (
    <tr className="transition hover:bg-gray-900/60">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gray-800 text-xs font-semibold text-white">
            {initials}
          </div>
          <div>
            <Link to={`/hr/candidates/${candidate.id}`} className="font-medium text-white hover:text-brand-300">
              {candidate.name}
            </Link>
            <p className="mt-0.5 text-xs text-gray-500">{candidate.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-gray-200">{candidate.department}</td>
      <td className="px-5 py-4 text-gray-200">{candidate.joining_date}</td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <ProgressBar value={candidate.readiness_score} className="w-28" />
          <span className="text-xs text-gray-400">{candidate.readiness_score}%</span>
        </div>
      </td>
      <td className="px-5 py-4">
        <Badge color={candidate.document_completion >= 100 ? "green" : candidate.document_completion === 0 ? "yellow" : "yellow"}>
          {candidate.document_completion}%
        </Badge>
      </td>
      <td className="px-5 py-4">
        <Badge color={completed ? "green" : notStarted ? "gray" : "blue"}>
          {completed ? "Completed" : notStarted ? "Not Started" : "In Progress"}
        </Badge>
      </td>
      <td className="px-5 py-4 text-right">
        <div className="flex justify-end gap-2">
          <Link
            to={`/hr/candidates/${candidate.id}`}
            className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            View
          </Link>
          <button type="button" onClick={() => onRemind(candidate.name)} className="rounded-lg border border-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-900">
            Remind
          </button>
          <button type="button" onClick={() => onDelete(candidate.id)} className="rounded-lg border border-red-900/70 px-3 py-2 text-sm text-red-300 hover:bg-red-950/40">
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
