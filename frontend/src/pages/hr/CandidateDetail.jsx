import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { hrApi } from "../../services/api";
import { Card, Badge, ProgressBar } from "../../components/ui";
import MetricCard from "../../components/dashboard/MetricCard";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const emptyTeamAssignment = {
  reporting_manager: "",
  hr_representative: "",
  buddy: "",
  team_members: "",
  department_overview: "",
};

const welcomeKitRequirements = [
  { id: "laptop", label: "Laptop allocation" },
  { id: "id_card", label: "ID card" },
  { id: "access_card", label: "Access card" },
  { id: "email", label: "Email creation" },
  { id: "software", label: "Software setup" },
  { id: "parking", label: "Parking pass" },
];

export default function CandidateDetail() {
  const { id }              = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingTeam, setSavingTeam] = useState(false);
  const [savingKit, setSavingKit] = useState(false);
  const [teamForm, setTeamForm] = useState(emptyTeamAssignment);
  const [kitAssignment, setKitAssignment] = useState({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    hrApi.getCandidate(id)
      .then((r) => {
        const payload = r.data;
        const candidate = payload?.candidate ?? payload;
        setData(payload);
        setTeamForm({
          reporting_manager: candidate?.team_assignment?.reporting_manager ?? "",
          hr_representative: candidate?.team_assignment?.hr_representative ?? "",
          buddy: candidate?.team_assignment?.buddy ?? "",
          team_members: (candidate?.team_assignment?.team_members ?? []).join(", "),
          department_overview: candidate?.team_assignment?.department_overview ?? "",
        });
        setKitAssignment(candidate?.welcome_kit_assignment ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  const c = data?.candidate ?? data;

  if (!c)   return (
    <div className="text-center py-12">
      <p className="text-gray-400">Candidate not found.</p>
      <Link to="/hr" className="text-brand-400 hover:text-brand-300 text-sm mt-2 inline-block">
        ← Back to HR Dashboard
      </Link>
    </div>
  );

  const setTeam = (key) => (event) =>
    setTeamForm((current) => ({ ...current, [key]: event.target.value }));

  const toggleKitRequirement = (id) => {
    setKitAssignment((current) => ({ ...current, [id]: !current[id] }));
  };

  const saveTeamAssignment = async (event) => {
    event.preventDefault();
    setSavingTeam(true);
    setNotice("");
    const team_assignment = {
      reporting_manager: teamForm.reporting_manager.trim(),
      hr_representative: teamForm.hr_representative.trim(),
      buddy: teamForm.buddy.trim(),
      team_members: teamForm.team_members
        .split(",")
        .map((member) => member.trim())
        .filter(Boolean),
      department_overview: teamForm.department_overview.trim(),
    };
    try {
      const res = await hrApi.updateCandidate(c.id, {
        team_assignment,
        last_activity: "Meet Your Team assigned by HR",
      });
      const updated = res.data?.candidate ?? { ...c, team_assignment };
      setData((current) => ({ ...(current ?? {}), candidate: updated }));
      setNotice("Meet Your Team assignment saved.");
    } finally {
      setSavingTeam(false);
    }
  };

  const saveWelcomeKitAssignment = async () => {
    setSavingKit(true);
    setNotice("");
    try {
      const res = await hrApi.updateCandidate(c.id, {
        welcome_kit_assignment: kitAssignment,
        last_activity: "Welcome kit assignment updated by HR",
      });
      const updated = res.data?.candidate ?? { ...c, welcome_kit_assignment: kitAssignment };
      setData((current) => ({ ...(current ?? {}), candidate: updated }));
      setNotice("Welcome kit assignment saved.");
    } finally {
      setSavingKit(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/hr" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← HR Dashboard
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-white text-sm font-medium">{c.name}</span>
      </div>

      {/* Profile */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-800 flex items-center justify-center text-white text-lg font-bold shrink-0">
            {c.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-lg font-bold">{c.name}</h2>
            <p className="text-gray-400 text-sm">{c.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge color="blue">{c.employee_id}</Badge>
              <Badge color="gray">{c.department}</Badge>
              <Badge color="gray">{c.location}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-800 text-sm">
          {[
            { label: "Role",        value: c.role },
            { label: "Joining",     value: c.joining_date },
            { label: "Phone",       value: c.phone ?? "—" },
            { label: "User Type",   value: c.user_type },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-gray-500 text-xs">{label}</p>
              <p className="text-white font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Profile"    value={c.profile_completion}  color="brand"  />
        <MetricCard label="Documents"  value={c.document_completion} color="green"  />
        <MetricCard label="Learning"   value={c.learning_completion} color="purple" />
        <MetricCard label="Readiness"  value={c.readiness_score}     color="orange" />
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-white font-semibold">Assign Meet Your Team</h3>
            <p className="mt-1 text-sm text-gray-400">These details appear on the employee dashboard before Day 1.</p>
          </div>
          {notice ? <Badge color="green">{notice}</Badge> : null}
        </div>

        <form onSubmit={saveTeamAssignment} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-gray-300">Reporting manager</span>
              <input className="w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2.5 text-sm text-white outline-none" value={teamForm.reporting_manager} onChange={setTeam("reporting_manager")} />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-gray-300">HR representative</span>
              <input className="w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2.5 text-sm text-white outline-none" value={teamForm.hr_representative} onChange={setTeam("hr_representative")} />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-gray-300">Buddy</span>
              <input className="w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2.5 text-sm text-white outline-none" value={teamForm.buddy} onChange={setTeam("buddy")} />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-gray-300">Team members</span>
              <input className="w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2.5 text-sm text-white outline-none" value={teamForm.team_members} onChange={setTeam("team_members")} placeholder="Comma separated names" />
            </label>
          </div>
          <label className="block space-y-2">
            <span className="block text-sm font-medium text-gray-300">Department overview</span>
            <textarea className="min-h-24 w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2.5 text-sm text-white outline-none" value={teamForm.department_overview} onChange={setTeam("department_overview")} />
          </label>
          <div className="flex justify-end">
            <button type="submit" disabled={savingTeam} className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {savingTeam ? "Saving..." : "Save team assignment"}
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-white font-semibold">Welcome Kit Assignment</h3>
            <p className="mt-1 text-sm text-gray-400">Tick the requirements that are present or ready for this employee.</p>
          </div>
          <Badge color={welcomeKitRequirements.every((item) => kitAssignment[item.id]) ? "green" : "yellow"}>
            {welcomeKitRequirements.filter((item) => kitAssignment[item.id]).length}/{welcomeKitRequirements.length} ready
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {welcomeKitRequirements.map((item) => (
            <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-800 bg-gray-950/60 p-3 transition-colors hover:border-gray-700">
              <input
                checked={Boolean(kitAssignment[item.id])}
                className="h-4 w-4 rounded border-gray-700 bg-gray-900 accent-brand-600"
                onChange={() => toggleKitRequirement(item.id)}
                type="checkbox"
              />
              <span className="text-sm font-medium text-white">{item.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={savingKit}
            onClick={saveWelcomeKitAssignment}
            className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {savingKit ? "Saving..." : "Save welcome kit"}
          </button>
        </div>
      </Card>

      {/* Documents */}
      {data.documents?.length > 0 && (
        <Card>
          <h3 className="text-white font-semibold mb-3">Documents</h3>
          <div className="space-y-2">
            {data.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-2 border-b border-gray-800/60 last:border-0">
                <p className="text-gray-300 text-sm">{doc.name}</p>
                <Badge color={{ missing: "red", submitted: "yellow", verified: "green" }[doc.status] ?? "gray"}>
                  {doc.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
