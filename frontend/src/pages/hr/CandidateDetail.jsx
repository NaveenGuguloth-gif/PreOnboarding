import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { hrApi } from "../../services/api";
import { Card, Badge, ProgressBar } from "../../components/ui";
import MetricCard from "../../components/dashboard/MetricCard";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function CandidateDetail() {
  const { id }              = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrApi.getCandidate(id)
      .then((r) => setData(r.data))
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
