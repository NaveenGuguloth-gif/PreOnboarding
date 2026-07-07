import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { candidateApi } from "../../services/api";
import { Card } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

// One accent per track — reused across the ring metrics and quick links
// so a color always means the same thing across the dashboard.
const TRACK = {
  profile: { accent: "#C58F73", from: "#C58F73", to: "#8A857E", soft: "bg-orange-500/10", text: "text-orange-300", panel: "linear-gradient(135deg, #F2E0D5, #FDFBF7)" },
  documents: { accent: "#6B7A68", from: "#A3B19B", to: "#6B7A68", soft: "bg-lime-500/10", text: "text-lime-300", panel: "linear-gradient(135deg, #DDE7D9, #F4F6F4)" },
  learning: { accent: "#475569", from: "#475569", to: "#0F172A", soft: "bg-cyan-500/10", text: "text-cyan-300", panel: "linear-gradient(135deg, #DDE6F0, #F1F5F9)" },
  readiness: { accent: "#2E302F", from: "#2E302F", to: "#1C231F", soft: "bg-amber-500/10", text: "text-amber-300", panel: "linear-gradient(135deg, #D7DDD4, #F2E8E0)" },
};

const profileItems = [
  { id: "personal_info", title: "Complete personal information", description: "Name, role, department, location, and joining details." },
  { id: "emergency_contacts", title: "Emergency contacts", description: "Add at least one reachable emergency contact." },
  { id: "bank_details", title: "Bank details", description: "Provide salary account and payment information." },
  { id: "tax_information", title: "Tax information", description: "Complete PAN, tax declaration, and statutory details." },
  { id: "profile_photo", title: "Profile photo", description: "Upload a clear employee profile photo." },
];

const defaultDepartmentContact = {
  reporting_manager: "",
  hr_representative: "",
  buddy: "",
  team_members: [],
  department_overview: "HR has not assigned your team introduction yet. It will appear here before Day 1.",
};

const dayOneTimeline = [
  { time: "9:00 AM", title: "Security Gate", description: "Arrive with government ID, joining letter, and visitor/security instructions." },
  { time: "9:20 AM", title: "HR Welcome Desk", description: "Meet HR, receive day-one guidance, and confirm reporting details." },
  { time: "10:00 AM", title: "Document Verification", description: "Submit originals for verification and clear pending onboarding documents." },
  { time: "11:30 AM", title: "Team Introduction", description: "Meet your manager, buddy, and immediate team members." },
  { time: "1:00 PM", title: "Lunch", description: "Lunch break with your buddy or team representative." },
  { time: "2:00 PM", title: "Plant Tour", description: "Guided plant orientation covering safety zones and key facilities." },
];

const welcomeKitItems = [
  { id: "laptop", label: "Laptop allocation", status: "In progress", detail: "IT will confirm device handover before joining." },
  { id: "id_card", label: "ID card", status: "Pending", detail: "Printed after final document verification." },
  { id: "access_card", label: "Access card", status: "Pending", detail: "Activated for assigned plant/building access." },
  { id: "email", label: "Email creation", status: "Ready", detail: "Corporate email setup is queued by IT." },
  { id: "software", label: "Software setup", status: "In progress", detail: "Role-based tools and access requests are being prepared." },
  { id: "parking", label: "Parking pass", status: "Optional", detail: "Issued if parking is requested and approved." },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [peers, setPeers] = useState([]);
  const [peerQuery, setPeerQuery] = useState("");
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [savingProfile, setSavingProfile] = useState("");
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState({
    day1: true,
    kit: true,
    profile: true,
    team: true,
    buddy: true,
    joining: true,
  });

  useEffect(() => {
    Promise.all([candidateApi.getMetrics(), candidateApi.listPeers()])
      .then(([metricsResponse, peersResponse]) => {
        setMetrics(metricsResponse.data);
        setPeers(peersResponse.data?.peers ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const daysLeft = metrics?.daysRemaining ?? "—";
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const joiningCountdown =
    daysLeft === 0 ? "Joining today" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} to go for joining`;

  const quickLinks = [
    { to: "/dashboard/documents", title: "Documents", desc: "Upload required documents", icon: "📄", pct: metrics?.documentCompletion, track: TRACK.documents },
    { to: "/dashboard/learning", title: "Learning", desc: "Complete onboarding modules", icon: "🎓", pct: metrics?.learningCompletion, track: TRACK.learning },
    { to: "/dashboard/relocation", title: "Relocation", desc: "Housing & transport support", icon: "🗺️", pct: null, track: TRACK.profile },
    { to: "/dashboard/assistant", title: "AI Assistant", desc: "Ask questions about onboarding", icon: "🤖", pct: null, track: TRACK.readiness },
  ];

  const joiningDetails = [
    { label: "Name", value: user?.name },
    { label: "Employee ID", value: user?.employeeId },
    { label: "Department", value: user?.department },
    { label: "Location", value: user?.location },
    { label: "Role", value: user?.role },
    { label: "Joining", value: user?.joiningDate },
  ];

  const teamInfo = metrics?.teamAssignment ?? defaultDepartmentContact;
  const teamAssigned = Boolean(
    teamInfo?.reporting_manager ||
    teamInfo?.hr_representative ||
    teamInfo?.buddy ||
    teamInfo?.team_members?.length
  );

  const profileSections = metrics?.profileSections ?? {};
  const welcomeKitAssignment = metrics?.welcomeKitAssignment ?? {};
  const normalizedPeerQuery = peerQuery.trim().toLowerCase();
  const filteredPeers = peers.filter((peer) => {
    if (!normalizedPeerQuery) return true;
    return [peer.name, peer.employee_id, peer.email, peer.department, peer.role, peer.location, peer.current_stage]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedPeerQuery));
  });
  const visibleWelcomeKitItems = welcomeKitItems.map((item) => ({
    ...item,
    status: welcomeKitAssignment[item.id] ? "Ready" : "Pending",
    detail: welcomeKitAssignment[item.id] ? "Confirmed by HR for your joining." : item.detail,
  }));
  const toggleSection = (id) => setOpenSections((current) => ({ ...current, [id]: !current[id] }));
  const updateProfileSection = async (id, checked) => {
    const nextSections = { ...profileSections, [id]: checked };
    const nextCompletion = Math.round(
      (profileItems.filter((item) => nextSections[item.id]).length / profileItems.length) * 100
    );
    setSavingProfile(id);
    setMetrics((current) => ({
      ...current,
      profileSections: nextSections,
      profileCompletion: nextCompletion,
      readinessScore: Math.round(
        (nextCompletion + (current?.documentCompletion ?? 0) + (current?.learningCompletion ?? 0)) / 3
      ),
    }));
    try {
      await candidateApi.updateProfile({ profileSections: nextSections });
      const refreshed = await candidateApi.getMetrics();
      setMetrics(refreshed.data);
    } finally {
      setSavingProfile("");
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-900 p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #C58F73, transparent 70%)" }}
        />
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#FDFBF7" }}>Onboarding</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Welcome, {firstName}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-base" style={{ color: "#E5E5E5" }}>
          <span className="rounded-full border px-3 py-1 font-semibold" style={{ borderColor: "#C58F73", backgroundColor: "rgba(197, 143, 115, 0.22)", color: "#FDFBF7" }}>
            {joiningCountdown}
          </span>
          {user?.department ? <span>{user.department}</span> : null}
          {user?.location ? <span>· {user.location}</span> : null}
        </div>
      </div>

      {/* Ring metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RingMetric label="Profile" value={metrics?.profileCompletion} track={TRACK.profile} />
        <RingMetric label="Documents" value={metrics?.documentCompletion} track={TRACK.documents} />
        <RingMetric label="Learning" value={metrics?.learningCompletion} track={TRACK.learning} />
        <RingMetric label="Readiness" value={metrics?.readinessScore} track={TRACK.readiness} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map(({ to, title, desc, icon, pct, track }) => (
          <Link key={to} to={to}>
            <div
              className="group h-full rounded-2xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700"
              style={{ borderTopColor: track.accent, borderTopWidth: 4, background: track.panel }}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${track.soft}`}>{icon}</span>
              <p className="mt-4 text-base font-semibold text-white">{title}</p>
              <p className="mt-1 text-sm text-gray-400">{desc}</p>
              {pct != null && (
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: track.accent }}
                    />
                  </div>
                  <p className={`mt-1.5 text-sm font-semibold ${track.text}`}>{pct}% complete</p>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <EmployeeSection id="day1" open={openSections.day1} title="Day-1 Preparation" onToggle={toggleSection}>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-400">Day 1 Simulator</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Know exactly what to expect</h3>
            <p className="mt-1 text-sm text-gray-400">Your first-day flow from security entry to plant tour.</p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-gray-800 px-3 py-1 text-sm font-semibold text-gray-500">
            {user?.joiningDate || "Joining day"}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-6">
          {dayOneTimeline.map((item, index) => (
            <DayOneStep
              item={item}
              key={item.time}
              step={index + 1}
            />
          ))}
        </div>
      </EmployeeSection>

      <EmployeeSection id="kit" open={openSections.kit} title="Welcome Kit" onToggle={toggleSection}>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-400">Welcome Kit Tracker</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Day-one assets and access</h3>
            <p className="mt-1 text-sm text-gray-400">Track laptop, cards, email, software, and parking readiness before arrival.</p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-gray-800 px-3 py-1 text-sm font-semibold text-gray-500">
            {visibleWelcomeKitItems.filter((item) => item.status === "Ready").length}/{visibleWelcomeKitItems.length} ready
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleWelcomeKitItems.map((item) => (
            <WelcomeKitItem item={item} key={item.id} />
          ))}
        </div>
      </EmployeeSection>

      <EmployeeSection id="profile" open={openSections.profile} title="Profile Tasks" onToggle={toggleSection}>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-400">Smart Profile Completion</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Profile readiness checklist</h3>
            <p className="mt-1 text-sm text-gray-400">Complete each profile item to raise your live completion percentage.</p>
          </div>
          <div className="min-w-48">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-white">{metrics?.profileCompletion ?? 0}% complete</span>
              <span className="text-gray-500">
                {profileItems.filter((item) => profileSections[item.id]).length}/{profileItems.length}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${metrics?.profileCompletion ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {profileItems.map((item) => (
            <ProfileChecklistItem
              checked={Boolean(profileSections[item.id])}
              item={item}
              key={item.id}
              loading={savingProfile === item.id}
              onChange={(checked) => updateProfileSection(item.id, checked)}
            />
          ))}
        </div>
      </EmployeeSection>

      <EmployeeSection id="team" open={openSections.team} title="Team Introduction" onToggle={toggleSection}>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-400">Meet Your Team</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Before Day 1</h3>
            <p className="mt-1 text-sm text-gray-400">This section is assigned by HR and appears here before your first day.</p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-gray-800 px-3 py-1 text-sm font-semibold text-gray-500">
            {teamAssigned ? "Assigned by HR" : "Pending HR assignment"}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <TeamPersonCard role="Reporting manager" name={teamInfo.reporting_manager || "Pending assignment"} tone="manager" />
          <TeamPersonCard role="HR representative" name={teamInfo.hr_representative || "Pending assignment"} tone="hr" />
          <TeamPersonCard role="Buddy" name={teamInfo.buddy || "Pending assignment"} tone="buddy" />
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
            <p className="text-sm font-semibold text-white">Team members</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(teamInfo.team_members?.length ? teamInfo.team_members : ["Pending assignment"]).map((member) => (
                <span key={member} className="rounded-full border border-gray-800 px-3 py-1 text-sm font-medium text-gray-400">
                  {member}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950/60 p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Department overview</p>
          <p className="mt-2 text-sm leading-6 text-gray-300">{teamInfo.department_overview || defaultDepartmentContact.department_overview}</p>
        </div>
      </EmployeeSection>

      <EmployeeSection id="buddy" open={openSections.buddy} title="Buddy Connect" onToggle={toggleSection}>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-400">Buddy Connect</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Explore your peer network</h3>
            <p className="mt-1 text-sm text-gray-400">View other employees by department, role, location, and onboarding stage.</p>
          </div>
          <div className="w-full lg:w-80">
            <label className="sr-only" htmlFor="buddy-search">Search employees</label>
            <input
              className="w-full rounded-xl border border-gray-800 bg-gray-950/70 px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
              id="buddy-search"
              onChange={(event) => setPeerQuery(event.target.value)}
              placeholder="Search employees"
              value={peerQuery}
            />
          </div>
        </div>

        {selectedPeer ? (
          <BuddyDetailPanel peer={selectedPeer} onClose={() => setSelectedPeer(null)} />
        ) : null}

        <div className="max-h-[520px] overflow-y-auto pr-1">
          {filteredPeers.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredPeers.map((peer) => (
                <BuddyPeerCard
                  key={peer.id || peer.email}
                  peer={peer}
                  selected={selectedPeer?.id === peer.id}
                  onView={() => setSelectedPeer(peer)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-800 bg-gray-950/60 p-6 text-center">
              <p className="text-sm font-semibold text-white">No employees found</p>
              <p className="mt-1 text-sm text-gray-500">Try a different name, department, role, or location.</p>
            </div>
          )}
        </div>
      </EmployeeSection>

      {/* Joining info */}
      <EmployeeSection id="joining" open={openSections.joining} title="Joining Details" onToggle={toggleSection}>
        <h3 className="mb-4 text-lg font-semibold text-white">Joining Details</h3>
        <div className="rounded-lg border border-gray-800">
          <div className="hidden border-b border-gray-800 bg-gray-950/60 text-sm font-semibold uppercase tracking-wide text-gray-400 lg:grid lg:grid-cols-6">
            {joiningDetails.map(({ label }) => (
              <div key={label} className="px-4 py-3">
                {label}
              </div>
            ))}
          </div>
          <div className="hidden text-base font-medium text-white lg:grid lg:grid-cols-6">
            {joiningDetails.map(({ label, value }) => (
              <div key={label} className="min-w-0 px-4 py-4">
                <span className="block truncate">{value ?? "—"}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-0 divide-y divide-gray-800 lg:hidden">
            {joiningDetails.map(({ label, value }) => (
              <div key={label} className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3">
                <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">{label}</span>
                <span className="min-w-0 break-words text-base font-medium text-white">{value ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </EmployeeSection>
    </div>
  );
}

function BuddyDetailPanel({ onClose, peer }) {
  const details = [
    { label: "Employee ID", value: peer.employee_id },
    { label: "Department", value: peer.department },
    { label: "Role", value: peer.role },
    { label: "Location", value: peer.location },
    { label: "Joining", value: peer.joining_date },
    { label: "Stage", value: peer.current_stage },
  ];

  return (
    <div className="mb-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <BuddyAvatar name={peer.name} />
          <div className="min-w-0">
            <h4 className="truncate text-lg font-semibold text-white">{peer.name || "Employee"}</h4>
            <p className="truncate text-sm text-gray-400">{peer.email || "Email not available"}</p>
          </div>
        </div>
        <button
          className="w-fit rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-900"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {details.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{value || "Not available"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuddyPeerCard({ onView, peer, selected }) {
  return (
    <div className={`rounded-lg border bg-gray-950/60 p-4 transition ${selected ? "border-indigo-500" : "border-gray-800 hover:border-gray-700"}`}>
      <div className="flex items-start gap-3">
        <BuddyAvatar name={peer.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{peer.name || "Employee"}</p>
          <p className="truncate text-sm text-gray-500">{peer.role || peer.department || "Role pending"}</p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-700 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {Math.max(0, Math.min(100, peer.readiness_score ?? 0))}%
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-gray-400">
        <p className="truncate"><span className="font-semibold text-gray-300">Department:</span> {peer.department || "Not available"}</p>
        <p className="truncate"><span className="font-semibold text-gray-300">Location:</span> {peer.location || "Not available"}</p>
        <p className="truncate"><span className="font-semibold text-gray-300">Stage:</span> {peer.current_stage || "Not available"}</p>
      </div>
      <button
        className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        onClick={onView}
        type="button"
      >
        View
      </button>
    </div>
  );
}

function BuddyAvatar({ name }) {
  const initials = (name || "Employee")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-sm font-bold text-indigo-300">
      {initials}
    </span>
  );
}

function WelcomeKitItem({ item }) {
  const statusClass = {
    Ready: "border-emerald-700 bg-emerald-50 text-emerald-700",
    "In progress": "border-blue-700 bg-blue-50 text-blue-700",
    Pending: "border-amber-700 bg-amber-50 text-amber-700",
    Optional: "border-gray-700 bg-gray-50 text-gray-700",
  }[item.status] ?? "border-gray-800 text-gray-500";

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{item.label}</p>
          <p className="mt-1 text-sm leading-5 text-gray-400">{item.detail}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
          {item.status}
        </span>
      </div>
    </div>
  );
}

function EmployeeSection({ children, id, onToggle, open, title }) {
  return (
    <Card>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="mb-4 flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</span>
        <span className="rounded-lg border border-gray-800 px-3 py-1 text-sm font-semibold text-gray-400">
          {open ? "Collapse" : "Expand"}
        </span>
      </button>
      {open ? children : null}
    </Card>
  );
}

function DayOneStep({ item, step }) {
  return (
    <div className="relative min-h-48 rounded-lg border border-gray-800 bg-gray-950/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
          {step}
        </span>
        <span className="rounded-full border border-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-500">
          {item.time}
        </span>
      </div>
      <h4 className="mt-4 text-base font-semibold text-white">{item.title}</h4>
      <p className="mt-2 text-sm leading-6 text-gray-400">{item.description}</p>
    </div>
  );
}

function TeamPersonCard({ name, role, tone }) {
  const toneClass = {
    manager: "bg-blue-500/10 text-blue-300",
    hr: "bg-emerald-500/10 text-emerald-300",
    buddy: "bg-amber-500/10 text-amber-300",
  }[tone] ?? "bg-indigo-500/10 text-indigo-300";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg text-sm font-bold ${toneClass}`}>
          {initials}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-sm text-gray-500">{role}</p>
        </div>
      </div>
    </div>
  );
}

function ProfileChecklistItem({ checked, item, loading, onChange }) {
  const isPhoto = item.id === "profile_photo";

  return (
    <div className="flex min-h-40 flex-col rounded-lg border border-gray-800 bg-gray-950/60 p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          checked={checked}
          className="mt-1 h-4 w-4 rounded border-gray-700 bg-gray-900 accent-indigo-600"
          disabled={loading}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">{item.title}</span>
          <span className="mt-1 block text-sm leading-5 text-gray-400">{item.description}</span>
        </span>
      </label>
      <div className="mt-auto pt-4">
        {isPhoto ? (
          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-900">
            <input
              accept="image/*"
              className="hidden"
              disabled={loading}
              onChange={(event) => onChange(Boolean(event.target.files?.[0]) || checked)}
              type="file"
            />
            {checked ? "Photo added" : "Upload photo"}
          </label>
        ) : (
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${checked ? "border-emerald-700 bg-emerald-50 text-emerald-700" : "border-gray-800 text-gray-500"}`}>
            {loading ? "Saving..." : checked ? "Completed" : "Pending"}
          </span>
        )}
      </div>
    </div>
  );
}

function RingMetric({ label, value, track }) {
  const percent = Math.min(100, Math.max(0, value ?? 0));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const gradientId = `ring-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4" style={{ background: `linear-gradient(135deg, ${track.accent}24, #FDFBF7)` }}>
      <div className="flex items-center gap-3">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={radius} fill="none" stroke="#E5E5E5" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 700ms ease" }}
            />
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={track.from} />
                <stop offset="100%" stopColor={track.to} />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-base font-bold text-white">{value != null ? `${percent}%` : "—"}</span>
        </div>
        <p className="text-base font-medium text-gray-300">{label}</p>
      </div>
    </div>
  );
}
