import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { hrApi } from "../../services/api";
import { Badge, Button, Input, ProgressBar } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const kpiMeta = [
  { key: "totalCandidates", label: "Total New Joiners", icon: "N", color: "blue", helper: "Registered employees" },
  { key: "joiningToday", label: "Joining Today", icon: "T", color: "orange", helper: "Day 1 starts today" },
  { key: "avgReadinessScore", label: "Average Readiness", icon: "R", color: "purple", suffix: "%", helper: "Across all joiners" },
  { key: "pendingDocuments", label: "Documents Pending", icon: "D", color: "red", helper: "Employees below 100%" },
  { key: "learningPending", label: "Learning Pending", icon: "L", color: "orange", helper: "Modules still incomplete" },
  { key: "attentionRequired", label: "Employees Needing Attention", icon: "A", color: "blue", helper: "Warnings or reminders" },
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
  const [sortBy, setSortBy] = useState("Newest");
  const [joiningWindow, setJoiningWindow] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [candidateForm, setCandidateForm] = useState(emptyCandidate);
  const [notice, setNotice] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [selectedIds, setSelectedIds] = useState([]);

  const loadDashboard = () => {
    const sortMap = {
      Newest: "joining_date",
      Readiness: "readiness_score",
      Name: "name",
      Department: "department",
      Location: "location",
    };

    return Promise.all([
      hrApi.listCandidates({
        sort: sortMap[sortBy] ?? "joining_date",
        order: sortBy === "Newest" ? "desc" : "asc",
        joining_window: joiningWindow,
        department: departmentFilter === "All" ? undefined : departmentFilter,
        location: locationFilter === "All" ? undefined : locationFilter,
        status: stageFilter === "All" ? undefined : stageFilter,
        page: pagination.page,
        limit: pagination.limit,
      }),
      hrApi.getAnalytics(),
    ])
      .then(([c, a]) => {
        const apiCandidates = c.data?.candidates ?? c.data ?? [];
        setCandidates(apiCandidates);
        setPagination((current) => c.data?.pagination ?? { ...current, total: apiCandidates.length, pages: 1 });
        setAnalytics(a.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, [sortBy, joiningWindow, departmentFilter, locationFilter, stageFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    setPagination((current) => ({ ...current, page: 1 }));
    setSelectedIds([]);
  }, [sortBy, joiningWindow, departmentFilter, locationFilter, stageFilter]);

  useEffect(() => {
    const timer = window.setInterval(loadDashboard, 30000);
    return () => window.clearInterval(timer);
  }, [sortBy, joiningWindow, departmentFilter, locationFilter, stageFilter, pagination.page, pagination.limit]);

  const filteredCandidates = candidates;

  const departmentOptions = useMemo(
    () => ["All", ...Array.from(new Set(candidates.map((candidate) => candidate.department).filter(Boolean))).sort()],
    [candidates]
  );
  const locationOptions = useMemo(
    () => ["All", ...Array.from(new Set(candidates.map((candidate) => candidate.location).filter(Boolean))).sort()],
    [candidates]
  );
  const stageOptions = useMemo(
    () => ["All", ...Array.from(new Set(candidates.map((candidate) => candidate.current_stage || candidate.hr_status).filter(Boolean))).sort()],
    [candidates]
  );

  if (loading) return <LoadingSpinner />;

  const totalDisplay = pagination.total || candidates.length;
  const allVisibleSelected = filteredCandidates.length > 0 && filteredCandidates.every((candidate) => selectedIds.includes(candidate.id));

  const setCandidate = (key) => (event) =>
    setCandidateForm((current) => ({ ...current, [key]: event.target.value }));

  const toggleSelected = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleVisibleSelected = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        const visible = new Set(filteredCandidates.map((candidate) => candidate.id));
        return current.filter((id) => !visible.has(id));
      }
      return Array.from(new Set([...current, ...filteredCandidates.map((candidate) => candidate.id)]));
    });
  };

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
        profile_completion: 0,
        document_completion: 0,
        learning_progress: 0,
        readiness_score: 0,
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
      profile_completion: 0,
      document_completion: 0,
      learning_progress: 0,
      readiness_score: 0,
    });
    setNotice("Bulk upload demo added 1 candidate.");
    await loadDashboard();
  };

  const notifyCandidate = async (candidate) => {
    await hrApi.notifyCandidate(candidate.id);
    setNotice(`Reminder sent to ${candidate.name}.`);
    await loadDashboard();
  };

  return (
    <div className="max-w-[1600px] space-y-6">
      <section className="grid gap-3 rounded-xl border border-gray-800 bg-[#0b1020] p-4 lg:grid-cols-[1fr_220px_220px] 2xl:grid-cols-[1fr_220px_220px_220px_180px]">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["today", "Today"],
            ["week", "This Week"],
            ["month", "This Month"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setJoiningWindow(value)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                joiningWindow === value
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-gray-800 bg-gray-950/60 text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <FilterSelect label="Department" value={departmentFilter} onChange={setDepartmentFilter} options={departmentOptions} />
        <FilterSelect label="Location" value={locationFilter} onChange={setLocationFilter} options={locationOptions} />
        <FilterSelect label="Stage" value={stageFilter} onChange={setStageFilter} options={stageOptions} />
        <label className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-sm text-gray-400">
          Page size
          <select
            value={pagination.limit}
            onChange={(event) => setPagination((current) => ({ ...current, page: 1, limit: Number(event.target.value) }))}
            className="min-w-0 flex-1 bg-transparent text-white outline-none"
          >
            {[25, 50, 100].map((size) => (
              <option key={size} className="bg-gray-950" value={size}>{size}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-sm text-gray-400">
          Sort
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-white outline-none"
          >
            {["Newest", "Readiness", "Name", "Department", "Location"].map((option) => (
              <option key={option} className="bg-gray-950">{option}</option>
            ))}
          </select>
        </label>
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
          {filteredCandidates.filter((candidate) => candidate.needs_attention).length} need reminder
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiMeta.map((item) => (
          <KpiCard analytics={analytics} item={item} key={item.key} />
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-800 bg-[#0b1020] shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 border-b border-gray-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">All Candidates</h2>
            <span className="rounded-full bg-brand-700/80 px-2.5 py-1 text-xs font-semibold text-white">{totalDisplay}</span>
            {selectedIds.length ? (
              <span className="rounded-full border border-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-300">{selectedIds.length} selected</span>
            ) : null}
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
            <table className="w-full min-w-[1500px] text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4 text-left">
                    <input
                      checked={allVisibleSelected}
                      className="h-4 w-4 rounded border-gray-700 bg-gray-900 accent-brand-600"
                      onChange={toggleVisibleSelected}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-5 py-4 text-left">Name</th>
                  <th className="px-5 py-4 text-left">Department</th>
                  <th className="px-5 py-4 text-left">Location</th>
                  <th className="px-5 py-4 text-left">Joining</th>
                  <th className="px-5 py-4 text-left">Profile</th>
                  <th className="px-5 py-4 text-left">Learning</th>
                  <th className="px-5 py-4 text-left">Readiness</th>
                  <th className="px-5 py-4 text-left">Documents</th>
                  <th className="px-5 py-4 text-left">Notification</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left">Stage</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {filteredCandidates.map((candidate) => (
                  <CandidateRow
                    candidate={candidate}
                    checked={selectedIds.includes(candidate.id)}
                    key={candidate.id}
                    onDelete={deleteCandidate}
                    onRemind={notifyCandidate}
                    onSelect={toggleSelected}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-gray-800 px-5 py-4 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + (filteredCandidates.length ? 1 : 0)}
            {" "}to {Math.min(pagination.page * pagination.limit, totalDisplay)} of {totalDisplay} results
          </span>
          <div className="flex items-center gap-2">
            {paginationButtons(pagination).map((item) => (
              <button
                key={item}
                type="button"
                disabled={item === "..." || item === pagination.page}
                onClick={() => {
                  if (item === "‹") setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }));
                  else if (item === "›") setPagination((current) => ({ ...current, page: Math.min(current.pages, current.page + 1) }));
                  else if (item !== "...") setPagination((current) => ({ ...current, page: item }));
                }}
                className={`h-9 min-w-9 rounded-lg border border-gray-800 px-3 text-sm ${
                  item === pagination.page ? "bg-brand-700 text-white" : "bg-gray-950/60 text-gray-400 hover:text-white disabled:cursor-default disabled:text-gray-600"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-[#0b1020] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Candidate Management</h3>
          <p className="mt-1 text-sm text-gray-400">Create employees manually or add a demo bulk candidate.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={bulkUploadDemo} className="rounded-lg border border-gray-800 px-5 py-3 text-sm font-semibold text-gray-300 transition hover:bg-gray-900 hover:text-white">
            Bulk Upload
          </button>
          <button type="button" onClick={() => setShowAddCandidate(true)} className="rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600">
            + New Candidate
          </button>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ analytics, item }) {
  const value = analytics?.[item.key] ?? 0;
  const colorMap = {
    blue: "bg-brand-700/20 text-brand-300 border-brand-800/80",
    green: "bg-green-900/30 text-green-300 border-green-800/80",
    purple: "bg-violet-900/30 text-violet-300 border-violet-800/80",
    orange: "bg-orange-900/30 text-orange-300 border-orange-800/80",
    red: "bg-red-900/20 text-red-300 border-red-800/80",
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
        {value}<span className="ml-1 text-sm font-normal text-gray-400">{item.suffix ?? ""}</span>
      </p>
      <p className="mt-2 text-xs text-gray-400">{item.helper}</p>
    </article>
  );
}

function FilterSelect({ label, onChange, options, value }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-sm text-gray-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} className="bg-gray-950">{option}</option>
        ))}
      </select>
    </label>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function joiningCountdown(candidate) {
  if (candidate.joining_days_remaining === 0) return "Joining today";
  if (candidate.joining_days_remaining > 0) {
    return `${candidate.joining_days_remaining} day${candidate.joining_days_remaining === 1 ? "" : "s"} to go`;
  }
  if (candidate.joining_days_remaining < 0) return "Joined";
  return candidate.joining_date || "Not set";
}

function learningPercent(candidate) {
  return candidate.learning_completion ?? candidate.learning_progress ?? 0;
}

function paginationButtons(pagination) {
  const pages = Math.max(1, pagination.pages || 1);
  const current = Math.min(Math.max(1, pagination.page || 1), pages);
  const middle = [current - 1, current, current + 1].filter((page) => page > 1 && page < pages);
  return ["‹", 1, ...(middle[0] > 2 ? ["..."] : []), ...middle, ...(middle[middle.length - 1] < pages - 1 ? ["..."] : []), ...(pages > 1 ? [pages] : []), "›"];
}

function onboardingStatus(candidate) {
  const readiness = candidate.readiness_score ?? 0;
  if (readiness >= 100) {
    return { label: "Ready", color: "green", dot: "●", tone: "ready" };
  }
  if (candidate.needs_attention || readiness < 30) {
    return { label: "Critical", color: "red", dot: "●", tone: "critical" };
  }
  return { label: "In Progress", color: "yellow", dot: "●", tone: "progress" };
}

function CandidateRow({ candidate, checked, onDelete, onRemind, onSelect }) {
  const initials = candidate.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const completed = candidate.readiness_score >= 100;
  const learning = candidate.learning_completion ?? candidate.learning_progress ?? 0;
  const status = onboardingStatus(candidate);
  const countdown =
    candidate.joining_days_remaining === 0
      ? "Joining today"
      : candidate.joining_days_remaining > 0
        ? `${candidate.joining_days_remaining}d left`
        : "Joined";

  return (
    <tr className={`transition hover:bg-gray-900/60 ${candidate.needs_attention ? "bg-amber-950/20" : ""}`}>
      <td className="px-5 py-4">
        <input
          checked={checked}
          className="h-4 w-4 rounded border-gray-700 bg-gray-900 accent-brand-600"
          onChange={() => onSelect(candidate.id)}
          type="checkbox"
        />
      </td>
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
      <td className="px-5 py-4 text-gray-200">{candidate.location || "—"}</td>
      <td className="px-5 py-4 text-gray-200">
        <div>{candidate.joining_date}</div>
        <div className={candidate.needs_attention ? "text-xs font-semibold text-amber-300" : "text-xs text-gray-500"}>
          {countdown}
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <ProgressBar value={candidate.profile_completion ?? 0} className="w-24" />
          <span className="text-xs text-gray-400">{candidate.profile_completion ?? 0}%</span>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <ProgressBar value={learning} className="w-24" />
          <span className="text-xs text-gray-400">{learning}%</span>
        </div>
      </td>
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
        <div className="space-y-1">
          <Badge color={candidate.notification_status === "Completed" ? "green" : candidate.notification_status === "Notified" ? "blue" : candidate.notification_status === "Pending Notification" ? "red" : "gray"}>
            {candidate.notification_status ?? "On Track"}
          </Badge>
          {candidate.last_notified_at ? (
            <p className="text-xs text-gray-500">Last: {new Date(candidate.last_notified_at).toLocaleDateString()}</p>
          ) : null}
        </div>
      </td>
      <td className="px-5 py-4">
        <Badge color={status.color}>
          <span className="mr-1.5">{status.dot}</span>
          {status.label}
        </Badge>
      </td>
      <td className="px-5 py-4 text-gray-300">{candidate.current_stage || candidate.hr_status || "Registered"}</td>
      <td className="px-5 py-4 text-right">
        <div className="flex justify-end gap-2">
          <Link
            to={`/hr/candidates/${candidate.id}`}
            className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            View
          </Link>
          <button
            type="button"
            onClick={() => onRemind(candidate)}
            disabled={completed}
            className="rounded-lg border border-amber-700/70 px-3 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-500"
          >
            Notify Employee
          </button>
          <button type="button" onClick={() => onDelete(candidate.id)} className="rounded-lg border border-red-900/70 px-3 py-2 text-sm text-red-300 hover:bg-red-950/40">
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
