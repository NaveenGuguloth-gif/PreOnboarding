import { useEffect, useMemo, useState } from "react";
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

const documentStatusColor = {
  missing: "gray",
  pending: "yellow",
  submitted: "yellow",
  uploaded: "yellow",
  verified: "green",
  approved: "green",
  rejected: "red",
};

const reviewableStatuses = new Set(["uploaded", "submitted", "rejected"]);
const documentAccent = {
  missing: "border-slate-700 bg-slate-900/50",
  pending: "border-amber-500/40 bg-amber-950/20",
  submitted: "border-amber-500/40 bg-amber-950/20",
  uploaded: "border-blue-500/40 bg-blue-950/20",
  verified: "border-emerald-500/50 bg-emerald-950/20",
  approved: "border-emerald-500/50 bg-emerald-950/20",
  rejected: "border-rose-500/50 bg-rose-950/20",
};

const statusLabels = {
  missing: "Pending",
  pending: "Pending Review",
  submitted: "Pending Review",
  uploaded: "Re-upload Submitted",
  verified: "Verified",
  approved: "Verified",
  rejected: "Re-upload Required",
};

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const displayStatus = (status) => statusLabels[status] ?? status ?? "Pending";

export default function CandidateDetail() {
  const { id }              = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingTeam, setSavingTeam] = useState(false);
  const [savingKit, setSavingKit] = useState(false);
  const [teamForm, setTeamForm] = useState(emptyTeamAssignment);
  const [kitAssignment, setKitAssignment] = useState({});
  const [notice, setNotice] = useState("");
  const [reviewingDoc, setReviewingDoc] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentFilter, setDocumentFilter] = useState("all");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [page, setPage] = useState(1);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [compareVersion, setCompareVersion] = useState(null);

  const loadCandidate = () =>
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
      });

  useEffect(() => {
    loadCandidate()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const documents = useMemo(() => data?.documents ?? [], [data]);
  const filteredDocuments = useMemo(() => {
    const term = documentSearch.trim().toLowerCase();
    return documents
      .filter((doc) => {
        if (documentFilter === "all") return true;
        if (documentFilter === "pending") return ["pending", "submitted", "uploaded", "missing"].includes(doc.status);
        if (documentFilter === "verified") return ["verified", "approved"].includes(doc.status);
        if (documentFilter === "rejected") return doc.status === "rejected";
        return true;
      })
      .filter((doc) =>
        [doc.name, doc.documentType, doc.file_name, doc.uploaded_by, doc.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
  }, [documents, documentFilter, documentSearch]);
  const selectedDoc = documents.find((doc) => doc.id === selectedDocId) ?? filteredDocuments[0] ?? documents[0];

  useEffect(() => {
    if (!selectedDocId && documents.length > 0) setSelectedDocId(documents[0].id);
    if (selectedDocId && documents.length > 0 && !documents.some((doc) => doc.id === selectedDocId)) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  useEffect(() => {
    if (!selectedDoc?.id) return;
    setViewerLoading(true);
    const timer = window.setTimeout(() => setViewerLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, [selectedDoc?.id]);

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

  const reviewDocument = async (doc, status, commentsOverride = "") => {
    const requirementId = doc.requirement_id ?? doc.id;
    let comments = commentsOverride;
    if (status === "rejected") {
      comments = comments.trim();
      if (!comments) {
        setNotice("Rejection reason is required.");
        return;
      }
    }
    setReviewingDoc(`${requirementId}-${status}`);
    setNotice("");
    try {
      await hrApi.reviewDocument(c.id, requirementId, { status, comments });
      await loadCandidate();
      setNotice(status === "rejected" ? "Document rejected and re-upload requested. Candidate notified." : "Document verified. Candidate notified.");
    } finally {
      setReviewingDoc("");
    }
  };

  const openRejectFlow = (doc, mode = "reject") => {
    setRejectTarget({ doc, mode });
    setRejectReason("");
  };

  const submitRejectFlow = async (event) => {
    event.preventDefault();
    if (!rejectReason.trim()) {
      setNotice("Rejection reason is required.");
      return;
    }
    const target = rejectTarget;
    setRejectTarget(null);
    await reviewDocument(target.doc, "rejected", rejectReason);
  };

  const openViewer = () => {
    setViewerOpen(true);
    setViewerLoading(true);
    window.setTimeout(() => setViewerLoading(false), 300);
  };

  return (
    <div className="space-y-6 max-w-7xl">
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

      {documents.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-gray-800 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-white font-semibold">Document Verification Center</h3>
                <p className="mt-1 text-sm text-gray-400">Inspect uploads, verify or reject documents, and review version history from one workspace.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge color="blue">{documents.filter((doc) => doc.file_name).length}/{documents.length} uploaded</Badge>
                <Badge color="green">{documents.filter((doc) => ["verified", "approved"].includes(doc.status)).length} verified</Badge>
                <Badge color="yellow">{documents.filter((doc) => ["submitted", "uploaded", "pending"].includes(doc.status)).length} pending</Badge>
              </div>
            </div>
          </div>

          <div className="grid min-h-[720px] lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="border-b border-gray-800 bg-gray-950/60 p-4 lg:border-b-0 lg:border-r">
              <div className="space-y-3">
                <input
                  value={documentSearch}
                  onChange={(event) => setDocumentSearch(event.target.value)}
                  placeholder="Search documents"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["all", "All"],
                    ["pending", "Pending"],
                    ["verified", "Verified"],
                    ["rejected", "Rejected"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDocumentFilter(value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                        documentFilter === value
                          ? "border-brand-500 bg-brand-700 text-white"
                          : "border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 max-h-[570px] space-y-2 overflow-y-auto pr-1">
                {filteredDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setPage(1);
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedDoc?.id === doc.id ? "border-brand-500 bg-brand-950/50" : documentAccent[doc.status] ?? "border-gray-800 bg-gray-950/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{doc.name}</p>
                        <p className="mt-1 truncate text-xs text-gray-500">{doc.file_name || "No file uploaded"}</p>
                      </div>
                      <Badge color={documentStatusColor[doc.status] ?? "gray"}>{displayStatus(doc.status)}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <span>{doc.file_type || "PDF"}</span>
                      <span className="text-right">{doc.file_size || doc.fileSize || "Not uploaded"}</span>
                    </div>
                  </button>
                ))}
                {filteredDocuments.length === 0 ? (
                  <p className="rounded-lg border border-gray-800 bg-gray-950 p-4 text-center text-sm text-gray-400">No documents match the selected filters.</p>
                ) : null}
              </div>
            </aside>

            <section className="min-w-0 bg-gray-950/30 p-4">
              {selectedDoc ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-gray-950/70 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold text-white">{selectedDoc.name}</h4>
                          <Badge color={documentStatusColor[selectedDoc.status] ?? "gray"}>{displayStatus(selectedDoc.status)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-gray-400">{selectedDoc.file_name || "Awaiting candidate upload"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-900">Zoom Out</button>
                        <button type="button" onClick={() => setZoom((value) => Math.min(180, value + 10))} className="rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-900">Zoom In</button>
                        <button type="button" onClick={() => setZoom(100)} className="rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-900">Fit</button>
                        <button type="button" onClick={() => setRotation((value) => (value + 90) % 360)} className="rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-900">Rotate</button>
                        <button type="button" onClick={openViewer} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600">Full Screen</button>
                      </div>
                    </div>

                    <DocumentPreview
                      doc={selectedDoc}
                      loading={viewerLoading}
                      page={page}
                      rotation={rotation}
                      setPage={setPage}
                      zoom={zoom}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/70 p-4">
                      <div className="text-sm text-gray-400">
                        Page {page} of {selectedDoc.file_type === "PDF" ? 3 : 1} · Zoom {zoom}% · Rotation {rotation} deg
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 disabled:opacity-40">Previous</button>
                        <button type="button" disabled={selectedDoc.file_type !== "PDF" || page >= 3} onClick={() => setPage((value) => Math.min(3, value + 1))} className="rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 disabled:opacity-40">Next</button>
                        {selectedDoc.file_url || selectedDoc.fileUrl ? (
                          <a href={hrApi.documentDownloadUrl(selectedDoc.file_url || selectedDoc.fileUrl)} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-900">Download</a>
                        ) : null}
                        <button type="button" onClick={() => window.print()} className="rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-900">Print</button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <VerificationControls
                      doc={selectedDoc}
                      onReject={() => openRejectFlow(selectedDoc, "reject")}
                      onRequestReupload={() => openRejectFlow(selectedDoc, "reupload")}
                      onVerify={() => reviewDocument(selectedDoc, "verified")}
                      reviewingDoc={reviewingDoc}
                    />
                    <DocumentMetadata doc={selectedDoc} />
                    <VersionHistory doc={selectedDoc} onCompare={setCompareVersion} />
                    <AuditTimeline doc={selectedDoc} />
                  </div>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-gray-400">Select a document to begin review.</p>
              )}
            </section>
          </div>
        </Card>
      )}

      {viewerOpen && selectedDoc ? (
        <div className="fixed inset-0 z-50 bg-gray-950">
          <div className="flex min-h-screen flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 bg-gray-950 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">{selectedDoc.name}</p>
                <p className="text-xs text-gray-500">{selectedDoc.file_name || "Preview"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-200">Zoom Out</button>
                <button type="button" onClick={() => setZoom((value) => Math.min(180, value + 10))} className="rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-200">Zoom In</button>
                <button type="button" onClick={() => setZoom(100)} className="rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-200">Fit</button>
                <button type="button" onClick={() => setRotation((value) => (value + 90) % 360)} className="rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-200">Rotate</button>
                <button type="button" onClick={() => setViewerOpen(false)} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-950">Close Viewer</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <DocumentPreview doc={selectedDoc} loading={viewerLoading} page={page} rotation={rotation} setPage={setPage} zoom={zoom} fullScreen />
            </div>
          </div>
        </div>
      ) : null}

      {rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 p-4">
          <form onSubmit={submitRejectFlow} className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-950 p-5 shadow-2xl">
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-white">{rejectTarget.mode === "reupload" ? "Request Re-upload" : "Reject Document"}</h4>
              <p className="mt-1 text-sm text-gray-400">A reason is mandatory and will be visible to the employee.</p>
            </div>
            <textarea
              autoFocus
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              className="min-h-32 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500"
              placeholder="Enter rejection reason or re-upload instruction"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRejectTarget(null)} className="rounded-lg border border-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-200">Cancel</button>
              <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500">Submit</button>
            </div>
          </form>
        </div>
      ) : null}

      {compareVersion && selectedDoc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/85 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-xl border border-gray-800 bg-gray-950 p-5 shadow-2xl">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-white">Compare Versions</h4>
                <p className="mt-1 text-sm text-gray-400">{selectedDoc.name}</p>
              </div>
              <button type="button" onClick={() => setCompareVersion(null)} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-950">Close</button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <ComparePane title={`Version ${compareVersion.version ?? "Previous"}`} doc={{ ...selectedDoc, ...compareVersion, status: compareVersion.status || selectedDoc.status }} />
              <ComparePane title="Current Version" doc={selectedDoc} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DocumentPreview({ doc, fullScreen = false, loading, page, rotation, setPage, zoom }) {
  const fileUrl = doc.file_preview_url || doc.file_url || doc.fileUrl;
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const fileType = (doc.file_type || doc.fileType || doc.content_type || "PDF").toUpperCase();
  const isImage = fileType.includes("JPG") || fileType.includes("JPEG") || fileType.includes("PNG") || doc.file_name?.match(/\.(jpg|jpeg|png)$/i);
  const isPdf = fileType.includes("PDF") || doc.file_name?.match(/\.pdf$/i);
  const height = fullScreen ? "min-h-[calc(100vh-120px)]" : "min-h-[460px]";

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setPreviewError("");
    setPreviewUrl("");
    if (!fileUrl) return undefined;

    hrApi.getDocumentPreviewUrl(fileUrl)
      .then((url) => {
        if (!active) {
          if (url.startsWith("blob:") && !fileUrl.startsWith("blob:")) URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url.startsWith("blob:") && !fileUrl.startsWith("blob:") ? url : "";
        setPreviewUrl(url);
      })
      .catch(() => {
        if (active) setPreviewError("Unable to load the uploaded file preview.");
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl]);

  return (
    <div className={`relative overflow-auto rounded-lg border border-gray-800 bg-slate-100 p-4 ${height}`}>
      {loading || (fileUrl && !previewUrl && !previewError) ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90">
          <div className="w-full max-w-lg space-y-3">
            <div className="h-8 animate-pulse rounded bg-slate-300" />
            <div className="h-72 animate-pulse rounded bg-slate-200" />
            <div className="h-6 animate-pulse rounded bg-slate-300" />
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-[420px] items-center justify-center">
        {previewUrl && isPdf ? (
          <iframe
            title={doc.name}
            src={`${previewUrl}#page=${page}&zoom=${zoom}`}
            className="h-[640px] w-full rounded border border-slate-300 bg-white"
            style={{ transform: `rotate(${rotation}deg) scale(${zoom / 100})`, transformOrigin: "center" }}
          />
        ) : previewUrl && isImage ? (
          <img
            alt={doc.name}
            src={previewUrl}
            className="max-h-[680px] max-w-full rounded bg-white object-contain shadow-lg"
            style={{ transform: `rotate(${rotation}deg) scale(${zoom / 100})`, transformOrigin: "center" }}
          />
        ) : previewError ? (
          <div className="rounded-lg border border-rose-200 bg-white p-6 text-center text-sm text-rose-700">
            {previewError}
          </div>
        ) : (
          <SimulatedDocument doc={doc} isImage={isImage} page={page} rotation={rotation} setPage={setPage} zoom={zoom} />
        )}
      </div>
    </div>
  );
}

function SimulatedDocument({ doc, isImage, page, rotation, setPage, zoom }) {
  if (isImage) {
    return (
      <div
        className="relative aspect-[4/5] w-full max-w-[440px] overflow-hidden rounded bg-white shadow-xl"
        style={{ transform: `rotate(${rotation}deg) scale(${zoom / 100})`, transformOrigin: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-white to-emerald-100" />
        <div className="absolute left-8 top-8 h-28 w-28 rounded-full border-4 border-white bg-slate-300 shadow" />
        <div className="absolute bottom-8 left-8 right-8 space-y-3">
          <div className="h-4 rounded bg-slate-400" />
          <div className="h-4 w-2/3 rounded bg-slate-300" />
          <div className="h-16 rounded border border-slate-300 bg-white/70" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-[620px] rounded bg-white p-10 text-slate-900 shadow-xl"
      style={{ transform: `rotate(${rotation}deg) scale(${zoom / 100})`, transformOrigin: "center" }}
    >
      <div className="mb-8 flex items-start justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Pre-Onboarding Document</p>
          <h5 className="mt-2 text-2xl font-bold">{doc.name}</h5>
        </div>
        <span className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold">Page {page}</span>
      </div>
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <PreviewField label="Candidate" value={doc.uploaded_by || "Candidate"} />
          <PreviewField label="File" value={doc.file_name || "Awaiting upload"} />
          <PreviewField label="Uploaded" value={formatDateTime(doc.uploaded_at)} />
          <PreviewField label="Status" value={displayStatus(doc.status)} />
        </div>
        <div className="space-y-3 pt-5">
          <div className="h-3 rounded bg-slate-200" />
          <div className="h-3 rounded bg-slate-200" />
          <div className="h-3 w-4/5 rounded bg-slate-200" />
          <div className="mt-8 h-28 rounded border border-dashed border-slate-300 bg-slate-50" />
        </div>
      </div>
      <div className="mt-8 flex justify-between text-xs text-slate-500">
        <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous page</button>
        <button type="button" disabled={page >= 3} onClick={() => setPage((value) => Math.min(3, value + 1))}>Next page</button>
      </div>
    </div>
  );
}

function PreviewField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function VerificationControls({ doc, onReject, onRequestReupload, onVerify, reviewingDoc }) {
  const actionKey = `${doc.requirement_id ?? doc.id}`;
  const canReview = reviewableStatuses.has(doc.status) && Boolean(doc.file_name || doc.file_url || doc.fileUrl);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-white">Verification Workflow</h4>
        <Badge color={documentStatusColor[doc.status] ?? "gray"}>{displayStatus(doc.status)}</Badge>
      </div>
      <div className="grid gap-2">
        <button
          type="button"
          disabled={!canReview || Boolean(reviewingDoc)}
          onClick={onVerify}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {reviewingDoc === `${actionKey}-verified` ? "Verifying..." : "Verify Document"}
        </button>
        <button
          type="button"
          disabled={!canReview || Boolean(reviewingDoc)}
          onClick={onReject}
          className="rounded-lg border border-rose-500/50 bg-rose-950/40 px-4 py-2.5 text-sm font-semibold text-rose-100 hover:bg-rose-900/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {reviewingDoc === `${actionKey}-rejected` ? "Rejecting..." : "Reject Document"}
        </button>
        <button
          type="button"
          disabled={!canReview || Boolean(reviewingDoc)}
          onClick={onRequestReupload}
          className="rounded-lg border border-blue-500/50 bg-blue-950/40 px-4 py-2.5 text-sm font-semibold text-blue-100 hover:bg-blue-900/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Request Re-upload
        </button>
      </div>
      {!canReview ? <p className="mt-3 text-xs text-gray-500">Review actions unlock when a candidate upload is available.</p> : null}
    </div>
  );
}

function DocumentMetadata({ doc }) {
  const rows = [
    ["Document Name", doc.name],
    ["Upload Date & Time", formatDateTime(doc.uploaded_at || doc.uploadedAt)],
    ["Current Status", displayStatus(doc.status)],
    ["File Type", doc.file_type || doc.fileType || doc.content_type || "PDF"],
    ["File Size", doc.file_size || doc.fileSize || "Not available"],
    ["Uploaded By", doc.uploaded_by || doc.uploadedBy || "Candidate"],
    ["Last Updated", formatDateTime(doc.updated_at || doc.updatedAt || doc.lastUpdated)],
    ["Verified By", doc.verifiedBy || doc.verified_by || "Not verified"],
    ["Verified At", formatDateTime(doc.verifiedAt || doc.verified_at)],
  ];

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
      <h4 className="mb-3 text-sm font-semibold text-white">Metadata</h4>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-gray-900 pb-2 text-sm last:border-0 last:pb-0">
            <span className="text-gray-500">{label}</span>
            <span className="text-right font-medium text-gray-200">{value || "Not available"}</span>
          </div>
        ))}
      </div>
      {doc.rejectionReason || doc.rejection_reason || doc.comments ? (
        <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-100">
          {doc.rejectionReason || doc.rejection_reason || doc.comments}
        </div>
      ) : null}
    </div>
  );
}

function VersionHistory({ doc, onCompare }) {
  const versions = doc.versions ?? [];

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
      <h4 className="mb-3 text-sm font-semibold text-white">Version History</h4>
      <div className="space-y-2">
        {versions.length ? versions.map((version, index) => (
          <div key={`${version.version}-${index}`} className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Version {version.version ?? index + 1}</p>
              <Badge color={documentStatusColor[version.status] ?? "gray"}>{displayStatus(version.status)}</Badge>
            </div>
            <div className="mt-2 space-y-1 text-xs text-gray-500">
              <p>Uploaded: {formatDateTime(version.uploaded_at)}</p>
              <p>Uploaded By: {version.uploaded_by || "Candidate"}</p>
              <p>File: {version.file_name || doc.file_name || "Previous copy"}</p>
              <p>Verified By: {version.verified_by || "Not verified"}</p>
            </div>
            <button
              type="button"
              onClick={() => onCompare(version)}
              className="mt-3 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-800"
            >
              Compare with current
            </button>
          </div>
        )) : (
          <p className="text-sm text-gray-500">No versions available yet.</p>
        )}
      </div>
    </div>
  );
}

function ComparePane({ doc, title }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-sm font-semibold text-white">{title}</h5>
        <Badge color={documentStatusColor[doc.status] ?? "gray"}>{displayStatus(doc.status)}</Badge>
      </div>
      <div className="mb-4 grid gap-2 text-xs text-gray-400">
        <p>File: {doc.file_name || "Not available"}</p>
        <p>Uploaded: {formatDateTime(doc.uploaded_at)}</p>
        <p>Uploaded By: {doc.uploaded_by || "Candidate"}</p>
        <p>Verified By: {doc.verified_by || doc.verifiedBy || "Not verified"}</p>
      </div>
      <div className="max-h-[440px] overflow-auto rounded-lg bg-slate-100 p-4">
        <SimulatedDocument doc={doc} isImage={(doc.file_type || "").includes("JPG") || (doc.file_type || "").includes("PNG")} page={1} rotation={0} setPage={() => {}} zoom={70} />
      </div>
    </div>
  );
}

function AuditTimeline({ doc }) {
  const items = doc.auditTrail ?? [];

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
      <h4 className="mb-3 text-sm font-semibold text-white">Audit Timeline</h4>
      <div className="space-y-3">
        {items.length ? items.map((item) => (
          <div key={item.id} className="relative border-l border-gray-800 pl-4">
            <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-brand-500" />
            <p className="text-sm font-semibold text-white">{item.action}</p>
            <p className="mt-1 text-xs text-gray-500">{item.actor || "System"} · {formatDateTime(item.at)}</p>
            {item.note ? <p className="mt-1 text-xs text-gray-400">{item.note}</p> : null}
          </div>
        )) : (
          <p className="text-sm text-gray-500">No audit events recorded yet.</p>
        )}
      </div>
    </div>
  );
}
