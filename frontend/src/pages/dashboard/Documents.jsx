import { useEffect, useMemo, useState } from "react";
import { documentsApi } from "../../services/api";
import { Badge } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const statusColor = { missing: "red", submitted: "yellow", verified: "green" };

// Each status gets a dot + accent so the list reads at a glance,
// independent of the Badge component's fixed palette.
const STATUS_THEME = {
  missing: { accent: "#EF4444", dot: "bg-rose-500" },
  submitted: { accent: "#F59E0B", dot: "bg-amber-500" },
  verified: { accent: "#10B981", dot: "bg-emerald-500" },
};

const validationTips = [
  { id: "clear", title: "Use clear scans", description: "Text and numbers are readable." },
  { id: "match", title: "Match profile details", description: "Name matches your profile." },
  { id: "fresh", title: "Check file freshness", description: "Bank/address proof is recent." },
  { id: "originals", title: "Keep originals ready", description: "Originals are ready for day one." },
];

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState("");
  const [checkedTips, setCheckedTips] = useState({});

  const load = () =>
    documentsApi
      .list()
      .then((r) => setDocs(r.data?.documents ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (docId, file) => {
    if (!file) return;
    setUploading(docId);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("documentId", docId);
    try {
      await documentsApi.upload(docId, fd);
      await load();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  };

  const stats = useMemo(() => {
    const submitted = docs.filter((d) => d.status !== "missing").length;
    return {
      required: docs.length,
      submitted,
      pending: docs.length - submitted,
      verified: docs.filter((d) => d.status === "verified").length,
    };
  }, [docs]);

  const tipsChecked = Object.values(checkedTips).filter(Boolean).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl space-y-6">
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
        <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
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

        <DocumentUploadPanel documents={docs} handleUpload={handleUpload} uploading={uploading} />
      </DocumentPanel>

      <DocumentPanel>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge color="blue">AI validation</Badge>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-white">Smart document pre-check</h3>
          </div>
          <Badge color="gray">{tipsChecked}/{validationTips.length} checked</Badge>
        </div>
        <div className="h-1.5 mb-4 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${(tipsChecked / validationTips.length) * 100}%` }}
          />
        </div>
        <div className="grid gap-2">
          {validationTips.map((item) => (
            <ValidationCheck
              checked={Boolean(checkedTips[item.id])}
              item={item}
              key={item.id}
              onChange={() =>
                setCheckedTips((current) => ({ ...current, [item.id]: !current[item.id] }))
              }
            />
          ))}
        </div>
      </DocumentPanel>
    </div>
  );
}

function DocumentUploadPanel({ documents, handleUpload, uploading }) {
  if (documents.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">No documents found.</p>;
  }

  return (
    <div className="grid gap-3">
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
                </div>
              </div>

              {document.status !== "verified" ? (
                <label className="shrink-0">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    onChange={(event) => handleUpload(document.id, event.target.files?.[0])}
                  />
                  <span
                    className={`inline-flex cursor-pointer items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${
                      uploading === document.id ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    {uploading === document.id ? "Uploading…" : document.status === "missing" ? "Upload" : "Re-upload"}
                  </span>
                </label>
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

function DocumentStat({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
      <p className="text-sm text-gray-400">{label}</p>
      <strong className="mt-3 block text-3xl font-semibold text-white">{value}</strong>
    </div>
  );
}

function ValidationCheck({ checked, item, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-800 bg-gray-950/60 p-3 transition-colors hover:border-gray-700">
      <input
        checked={checked}
        className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 accent-indigo-500"
        onChange={onChange}
        type="checkbox"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white">{item.title}</span>
        <span className="mt-0.5 block text-xs text-gray-400">{item.description}</span>
      </span>
    </label>
  );
}

function DocumentPanel({ children }) {
  return <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">{children}</div>;
}

function formatStatus(status) {
  return (status ?? "unknown").replace(/_/g, " ");
}