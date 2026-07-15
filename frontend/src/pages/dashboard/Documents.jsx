import { useEffect, useMemo, useState } from "react";
import { documentsApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const statusColor = { missing: "red", pending: "red", submitted: "yellow", uploaded: "yellow", verified: "green", rejected: "red" };
const verificationColor = {
  PROCESSING: "blue",
  VERIFIED: "green",
  PROVISIONALLY_VERIFIED: "yellow",
  NEEDS_HR_REVIEW: "yellow",
  REJECTED: "red",
  VERIFICATION_UNAVAILABLE: "gray",
};

// Each status gets a dot + accent so the list reads at a glance,
// independent of the Badge component's fixed palette.
const STATUS_THEME = {
  missing: { accent: "#EF4444", dot: "bg-rose-500" },
  pending: { accent: "#EF4444", dot: "bg-rose-500" },
  submitted: { accent: "#F59E0B", dot: "bg-amber-500" },
  uploaded: { accent: "#F59E0B", dot: "bg-amber-500" },
  verified: { accent: "#10B981", dot: "bg-emerald-500" },
  rejected: { accent: "#EF4444", dot: "bg-rose-500" },
};

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState("");
  const [failedUpload, setFailedUpload] = useState(null);
  const candidateId = user?.id ?? user?.employeeId ?? user?.employee_id ?? "demo";

  const load = () =>
    documentsApi
      .list(candidateId)
      .then((r) => setDocs(r.data?.documents ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [candidateId]);

  const handleUpload = async (docId, file) => {
    if (!file) return;
    setUploading(docId);
    setFailedUpload(null);
    setUploadProgress((current) => ({ ...current, [docId]: 0 }));
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("documentId", docId);
    try {
      await documentsApi.upload(docId, fd, candidateId, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          const pct = Math.round((event.loaded / event.total) * 100);
          setUploadProgress((current) => ({ ...current, [docId]: pct }));
        },
      });
      await load();
    } catch {
      setFailedUpload({ docId, file });
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(null);
      setUploadProgress((current) => ({ ...current, [docId]: undefined }));
    }
  };

  const handleRemove = async (docId) => {
    setRemoving(docId);
    setError("");
    try {
      await documentsApi.remove(docId, candidateId);
      await load();
    } catch {
      setError("Remove failed. Please try again.");
    } finally {
      setRemoving(null);
    }
  };

  const stats = useMemo(() => {
    const submitted = docs.filter((d) => !["missing", "pending", "rejected"].includes(d.status)).length;
    return {
      required: docs.length,
      submitted,
      pending: docs.length - submitted,
      verified: docs.filter((d) => ["verified", "VERIFIED", "PROVISIONALLY_VERIFIED"].includes(d.status) || ["VERIFIED", "PROVISIONALLY_VERIFIED"].includes(d.verification_status)).length,
    };
  }, [docs]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="w-full space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-900 p-6 sm:flex sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Digital Document Center</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Documents</h2>
          <p className="mt-1 text-sm text-gray-400">Upload required joining files and track verification status.</p>
        </div>
        <Badge color={stats.pending === 0 ? "green" : "blue"}>
          {stats.submitted}/{stats.required} submitted
        </Badge>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-rose-800 bg-rose-950/60 px-4 py-3 text-sm text-rose-300 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          {failedUpload ? (
            <button
              type="button"
              onClick={() => handleUpload(failedUpload.docId, failedUpload.file)}
              className="w-fit rounded-lg border border-rose-700 px-3 py-1.5 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-900"
            >
              Retry upload
            </button>
          ) : null}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DocumentStat label="Required files" value={stats.required} accent="#6366F1" />
        <DocumentStat label="Submitted" value={stats.submitted} accent="#F59E0B" />
        <DocumentStat label="Pending" value={stats.pending} accent="#EF4444" />
        <DocumentStat label="Verified" value={stats.verified} accent="#10B981" />
      </section>

      <DocumentPanel>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge color="blue">Documents only</Badge>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">Required uploads</h3>
          </div>
          <Badge color="gray">PDF, JPG, PNG, DOC</Badge>
        </div>

        <DocumentUploadPanel
          documents={docs}
          handleRemove={handleRemove}
          handleUpload={handleUpload}
          removing={removing}
          uploadProgress={uploadProgress}
          uploading={uploading}
        />
      </DocumentPanel>
    </div>
  );
}

function DocumentUploadPanel({ documents, handleRemove, handleUpload, removing, uploadProgress, uploading }) {
  if (documents.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">No documents found.</p>;
  }

  return (
    <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
      {documents.map((document) => {
        const theme = STATUS_THEME[document.status] ?? STATUS_THEME.missing;
        return (
          <article
            key={document.id}
            className="rounded-xl border border-gray-800 bg-gray-950/60 p-4"
            style={{ borderLeftColor: theme.accent, borderLeftWidth: 4 }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${theme.dot}`} />
                  <strong className="text-sm text-white">{document.name}</strong>
                  <Badge color={statusColor[document.status] ?? "gray"}>{formatStatus(document.status)}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {document.deadline ? <span>Deadline: {document.deadline}</span> : null}
                  {document.uploaded_at ? <span>Uploaded: {document.uploaded_at}</span> : null}
                  {document.file_name ? <span>File: {document.file_name}</span> : null}
                  {document.approval_status ? <span>Approval: {document.approval_status}</span> : null}
                  {document.rejectionReason || document.rejection_reason ? <span className="text-rose-400">Rejected: {document.rejectionReason || document.rejection_reason}</span> : null}
                </div>
                {document.file_name ? (
                  <VerificationSummary document={document} />
                ) : null}
                {uploading === document.id ? (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${uploadProgress[document.id] ?? 10}%` }}
                    />
                  </div>
                ) : null}
              </div>

              {document.status !== "verified" ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      onChange={(event) => handleUpload(document.id, event.target.files?.[0])}
                    />
                    <span
                      className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${
                        uploading === document.id || removing === document.id ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      {uploading === document.id ? "Uploading..." : ["missing", "pending"].includes(document.status) ? "Upload" : "Re-upload"}
                    </span>
                  </label>
                  {document.file_name ? (
                    <button
                      type="button"
                      disabled={uploading === document.id || removing === document.id}
                      onClick={() => handleRemove(document.id)}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-rose-300 bg-white/60 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removing === document.id ? "Removing..." : "Remove"}
                    </button>
                  ) : null}
                </div>
              ) : (
                <Badge color="green">Verified</Badge>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function VerificationSummary({ document }) {
  const status = document.verification_status || document.verificationStatus || (document.status === "verified" ? "VERIFIED" : "");
  const explanation = document.verification_explanation || document.verificationExplanation || "";
  const score = document.overall_score ?? document.overallScore;
  const rules = document.risk_rules || document.riskRules || [];
  const completed = status && status !== "PROCESSING";
  return (
    <div className="mt-3 rounded-lg border border-gray-800 bg-gray-900/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color={verificationColor[status] ?? "gray"}>{status ? formatStatus(status) : "Uploaded"}</Badge>
        <span className="text-xs text-gray-500">
          Uploaded / Processing / {completed ? "Verification completed" : "Verification pending"}
        </span>
        {score !== null && score !== undefined ? <span className="text-xs text-gray-400">Score: {score}/100</span> : null}
      </div>
      {explanation ? <p className="mt-2 text-xs leading-5 text-gray-400">{explanation}</p> : null}
      {rules.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rules.slice(0, 3).map((rule, index) => (
            <span key={`${rule.rule || rule.check_type}-${index}`} className="rounded-full border border-gray-700 px-2 py-1 text-[11px] text-gray-400">
              {formatStatus(rule.rule || rule.check_type)}: {formatStatus(rule.status)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DocumentStat({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
      <p className="text-sm text-gray-400">{label}</p>
      <strong className="mt-3 block text-3xl font-semibold text-white">{value}</strong>
    </div>
  );
}

function DocumentPanel({ children }) {
  return <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">{children}</div>;
}

function formatStatus(status) {
  return (status ?? "unknown").replace(/_/g, " ");
}
