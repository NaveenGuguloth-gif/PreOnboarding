import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { hrApi } from "../../services/api";
import { Card, Badge } from "../../components/ui";
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
  { id: "employee_id", label: "Employee ID" },
  { id: "official_email", label: "Official Email" },
  { id: "laptop", label: "Laptop" },
];

const verificationColor = {
  PROCESSING: "blue",
  VERIFIED: "green",
  PROVISIONALLY_VERIFIED: "yellow",
  NEEDS_HR_REVIEW: "yellow",
  REJECTED: "red",
  VERIFICATION_UNAVAILABLE: "gray",
};

export default function CandidateDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState(emptyTeamAssignment);
  const [notice, setNotice] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [verificationDetails, setVerificationDetails] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [reviewingDoc, setReviewingDoc] = useState(false);
  const [reviewComment, setReviewComment] = useState("");

  const loadCandidate = () =>
    hrApi.getCandidate(id).then((r) => {
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
    });

  useEffect(() => {
    loadCandidate()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const c = data?.candidate ?? data;
  const setTeam = (key) => (event) =>
    setTeamForm((current) => ({ ...current, [key]: event.target.value }));
  const welcomeKitStatus = c?.welcomeKit?.items ?? c?.welcome_kit_assignment ?? {};
  const documents = data?.documents ?? [];
  const selectedDoc = documents.find((doc) => doc.id === selectedDocId) ?? documents.find((doc) => doc.file_name) ?? documents[0];

  const loadVerification = async (doc = selectedDoc) => {
    if (!doc?.id) return;
    setVerificationLoading(true);
    try {
      const res = await hrApi.getDocumentVerification(c.id, doc.id);
      setVerificationDetails(res.data ?? res);
      setSelectedDocId(doc.id);
    } finally {
      setVerificationLoading(false);
    }
  };

  const reviewDocument = async (status) => {
    if (!selectedDoc?.id) return;
    setReviewingDoc(true);
    try {
      await hrApi.reviewDocument(c.id, selectedDoc.id, { status, comments: reviewComment });
      await loadCandidate();
      setReviewComment("");
      await loadVerification(selectedDoc);
    } finally {
      setReviewingDoc(false);
    }
  };

  const retryVerification = async () => {
    if (!selectedDoc?.id) return;
    setVerificationLoading(true);
    try {
      await hrApi.retryDocumentVerification(c.id, selectedDoc.id);
      await loadCandidate();
      await loadVerification(selectedDoc);
    } finally {
      setVerificationLoading(false);
    }
  };

  useEffect(() => {
    if (c?.id && selectedDoc?.id) {
      loadVerification(selectedDoc).catch(() => {});
    }
  }, [c?.id, selectedDoc?.id]);

  if (loading) return <LoadingSpinner />;

  if (!c) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400">Candidate not found.</p>
        <Link to="/hr" className="mt-2 inline-block text-sm text-brand-400 hover:text-brand-300">
          Back to HR Dashboard
        </Link>
      </div>
    );
  }

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

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/hr" className="text-sm text-gray-400 transition-colors hover:text-white">
          HR Dashboard
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-sm font-medium text-white">{c.name}</span>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-800 text-lg font-bold text-white">
            {c.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">{c.name}</h2>
            <p className="text-sm text-gray-400">{c.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge color="blue">{c.employee_id}</Badge>
              <Badge color="gray">{c.department}</Badge>
              <Badge color="gray">{c.location}</Badge>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-800 pt-5 text-sm md:grid-cols-4">
          {[
            { label: "Role", value: c.role },
            { label: "Joining", value: c.joining_date },
            { label: "Phone", value: c.phone ?? "—" },
            { label: "User Type", value: c.user_type },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-0.5 font-medium text-white">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Profile" value={c.profile_completion} color="brand" />
        <MetricCard label="Documents" value={c.document_completion} color="green" />
        <MetricCard label="Learning" value={c.learning_completion} color="purple" />
        <MetricCard label="Readiness" value={c.readiness_score} color="orange" />
      </div>

      <Card>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-white">Document Verification</h3>
            <p className="mt-1 text-sm text-gray-400">Operational review status from uploads, OCR/profile checks, configured providers, and HR actions.</p>
          </div>
          <Badge color="gray">No originality claim</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {documents.map((doc) => {
              const active = selectedDoc?.id === doc.id;
              const status = doc.verification_status || doc.verificationStatus || (doc.status === "verified" ? "VERIFIED" : "");
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    loadVerification(doc).catch(() => {});
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    active ? "border-brand-500 bg-brand-950/40" : "border-gray-800 bg-gray-950/60 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{doc.name}</p>
                      <p className="mt-1 truncate text-xs text-gray-500">{doc.file_name || "Not uploaded"}</p>
                    </div>
                    <Badge color={verificationColor[status] ?? (doc.status === "rejected" ? "red" : "gray")}>
                      {status ? formatStatus(status) : formatStatus(doc.status)}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
                <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedDoc?.name || "Select a document"}</p>
                    <p className="text-xs text-gray-500">{selectedDoc?.file_name || "No uploaded file available"}</p>
                  </div>
                  {selectedDoc?.fileUrl || selectedDoc?.file_url ? (
                    <a className="text-sm font-medium text-brand-300 hover:text-brand-200" href={hrApi.documentDownloadUrl(selectedDoc.fileUrl || selectedDoc.file_url)} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : null}
                </div>
                <DocumentPreview document={selectedDoc} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <VerificationPanel title="Extracted Fields">
                  {Object.keys(verificationDetails?.extraction?.fields || selectedDoc?.extracted_fields || {}).length ? (
                    Object.entries(verificationDetails?.extraction?.fields || selectedDoc?.extracted_fields || {}).map(([key, value]) => (
                      <InfoRow key={key} label={formatStatus(key)} value={value || "Data unavailable"} />
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Data unavailable</p>
                  )}
                </VerificationPanel>
                <VerificationPanel title="Profile Match">
                  <InfoRow label="Employee name" value={c.name || "Data unavailable"} />
                  <InfoRow label="Email" value={c.email || "Data unavailable"} />
                  <InfoRow label="Employee ID" value={c.employee_id || "Data unavailable"} />
                  <InfoRow label="Department" value={c.department || "Data unavailable"} />
                </VerificationPanel>
              </div>

              <VerificationPanel title="Checks and Provider Results">
                {verificationLoading ? <p className="text-sm text-gray-500">Loading verification details...</p> : null}
                {(verificationDetails?.checks || selectedDoc?.risk_rules || []).length ? (
                  <div className="space-y-2">
                    {(verificationDetails?.checks || selectedDoc?.risk_rules || []).map((check, index) => (
                      <div key={check.id || `${check.rule}-${index}`} className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium text-white">{formatStatus(check.check_type || check.rule)}</span>
                          <Badge color={verificationColor[check.status] ?? "gray"}>{formatStatus(check.status)}</Badge>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-gray-500">{check.reason || "Data unavailable"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Data unavailable</p>
                )}
              </VerificationPanel>
            </div>

            <div className="space-y-4">
              <VerificationPanel title="Decision">
                <div className="space-y-3">
                  <Badge color={verificationColor[selectedDoc?.verification_status] ?? "gray"}>
                    {formatStatus(selectedDoc?.verification_status || "not processed")}
                  </Badge>
                  <InfoRow label="Score" value={selectedDoc?.overall_score !== null && selectedDoc?.overall_score !== undefined ? `${selectedDoc.overall_score}/100` : "Data unavailable"} />
                  <InfoRow label="Level" value={formatStatus(selectedDoc?.verification_level || "Data unavailable")} />
                  <p className="text-sm leading-6 text-gray-400">{selectedDoc?.verification_explanation || "Data unavailable"}</p>
                </div>
              </VerificationPanel>

              <VerificationPanel title="HR Action">
                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  className="min-h-24 w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2.5 text-sm text-white outline-none"
                  placeholder="Add review note or rejection reason"
                />
                <div className="mt-3 grid gap-2">
                  <button type="button" disabled={reviewingDoc || !selectedDoc?.file_name} onClick={() => reviewDocument("verified")} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
                    Approve manually
                  </button>
                  <button type="button" disabled={reviewingDoc || !selectedDoc?.file_name} onClick={() => reviewDocument("rejected")} className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50">
                    Reject / request re-upload
                  </button>
                  <button type="button" disabled={verificationLoading || !selectedDoc?.file_name} onClick={retryVerification} className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50">
                    Retry verification
                  </button>
                </div>
              </VerificationPanel>

              <VerificationPanel title="Audit">
                {(verificationDetails?.audit || selectedDoc?.auditTrail || []).length ? (
                  <div className="space-y-2">
                    {(verificationDetails?.audit || selectedDoc?.auditTrail || []).slice(0, 6).map((entry, index) => (
                      <div key={entry.id || index} className="border-b border-gray-800 pb-2 last:border-0">
                        <p className="text-xs font-medium text-gray-300">{formatStatus(entry.action || "activity")}</p>
                        <p className="text-[11px] text-gray-500">{entry.actor || "system"} - {entry.created_at || entry.at || ""}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Data unavailable</p>
                )}
              </VerificationPanel>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-white">Assign Meet Your Team</h3>
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
            <h3 className="font-semibold text-white">Welcome Kit Receipt Status</h3>
            <p className="mt-1 text-sm text-gray-400">Read-only confirmation status from the employee dashboard.</p>
          </div>
          <Badge color={welcomeKitRequirements.every((item) => welcomeKitStatus[item.id]) ? "green" : "yellow"}>
            {welcomeKitRequirements.filter((item) => welcomeKitStatus[item.id]).length}/{welcomeKitRequirements.length} confirmed
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {welcomeKitRequirements.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/60 p-3">
              <span className="text-sm font-medium text-white">{item.label}</span>
              <Badge color={welcomeKitStatus[item.id] ? "green" : "gray"}>
                {welcomeKitStatus[item.id] ? "Confirmed by employee" : "Not confirmed"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function DocumentPreview({ document }) {
  const fileUrl = document?.fileUrl || document?.file_url;
  if (!fileUrl) {
    return <div className="flex min-h-80 items-center justify-center text-sm text-gray-500">No preview available</div>;
  }
  const url = hrApi.documentDownloadUrl(fileUrl);
  const fileType = String(document.file_type || document.fileType || document.content_type || "").toLowerCase();
  if (fileType.includes("jpg") || fileType.includes("jpeg") || fileType.includes("png") || fileType.includes("image")) {
    return <img src={url} alt={document.name || "Document preview"} className="max-h-[520px] w-full object-contain bg-gray-950" />;
  }
  return <iframe title={document.name || "Document preview"} src={url} className="h-[520px] w-full bg-white" />;
}

function VerificationPanel({ title, children }) {
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
      <h4 className="mb-3 text-sm font-semibold text-white">{title}</h4>
      {children}
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="mb-2 flex items-start justify-between gap-3 border-b border-gray-800 pb-2 last:mb-0 last:border-0 last:pb-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-right text-sm text-gray-200">{value || "Data unavailable"}</span>
    </div>
  );
}

function formatStatus(status) {
  return String(status || "unknown").replace(/_/g, " ");
}
