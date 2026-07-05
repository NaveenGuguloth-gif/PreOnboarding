import { useEffect, useMemo, useState } from "react";
import { hrApi } from "../../services/api";
import { Badge, Button, Input } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const emptyForm = {
  name: "",
  department: "All",
  role: "",
  mandatory: true,
  due_days_before_joining: 7,
  reminder_days: 3,
  max_file_size_mb: 10,
  approval_required: true,
};

export default function HrDocuments() {
  const [requirements, setRequirements] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () =>
    hrApi
      .listDocumentRequirements()
      .then((res) => setRequirements(res.data?.requirements ?? []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return requirements.filter((item) => `${item.name} ${item.department} ${item.role}`.toLowerCase().includes(term));
  }, [query, requirements]);

  const set = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      due_days_before_joining: Number(form.due_days_before_joining) || 7,
      reminder_days: Number(form.reminder_days) || 3,
      max_file_size_mb: Number(form.max_file_size_mb) || 10,
      accepted_formats: [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"],
    };
    try {
      if (editingId) await hrApi.updateDocumentRequirement(editingId, payload);
      else await hrApi.createDocumentRequirement(payload);
      reset();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const edit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name ?? "",
      department: item.department ?? "All",
      role: item.role ?? "",
      mandatory: Boolean(item.mandatory),
      due_days_before_joining: item.due_days_before_joining ?? 7,
      reminder_days: item.reminder_days ?? 3,
      max_file_size_mb: item.max_file_size_mb ?? 10,
      approval_required: item.approval_required !== false,
    });
  };

  const remove = async (id) => {
    await hrApi.deleteDocumentRequirement(id);
    await load();
  };

  const actionButton =
    "h-10 w-24 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors";

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-[1400px] space-y-6">
      <section className="rounded-xl border border-gray-800 bg-[#0b1020] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge color="blue">Documents</Badge>
            <h2 className="mt-3 text-2xl font-semibold text-white">Document Requirements</h2>
            <p className="mt-1 text-gray-400">Control required uploads, due dates, reminders, and approval rules.</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-12 rounded-lg border border-gray-800 bg-gray-950/60 px-4 text-white outline-none focus:border-brand-600 lg:w-80"
            placeholder="Search requirements"
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form onSubmit={save} className="rounded-xl border border-gray-800 bg-[#0b1020] p-5">
          <h3 className="mb-4 text-lg font-semibold text-white">{editingId ? "Edit Requirement" : "Add Requirement"}</h3>
          <div className="space-y-4">
            <Input label="Document Name" value={form.name} onChange={set("name")} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Department" value={form.department} onChange={set("department")} />
              <Input label="Role" value={form.role} onChange={set("role")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Due Days" type="number" value={form.due_days_before_joining} onChange={set("due_days_before_joining")} />
              <Input label="Reminder Days" type="number" value={form.reminder_days} onChange={set("reminder_days")} />
              <Input label="Max MB" type="number" value={form.max_file_size_mb} onChange={set("max_file_size_mb")} />
            </div>
            <label className="flex items-center gap-3 text-gray-300">
              <input checked={form.mandatory} onChange={set("mandatory")} type="checkbox" className="h-4 w-4 accent-brand-600" />
              Mandatory upload
            </label>
            <label className="flex items-center gap-3 text-gray-300">
              <input checked={form.approval_required} onChange={set("approval_required")} type="checkbox" className="h-4 w-4 accent-brand-600" />
              HR approval required
            </label>
            <div className="flex gap-3">
              <Button type="submit" loading={saving} className="flex-1">
                {editingId ? "Save Changes" : "Create Requirement"}
              </Button>
              {editingId ? <Button type="button" variant="secondary" onClick={reset}>Cancel</Button> : null}
            </div>
          </div>
        </form>

        <div className="grid gap-3">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-xl border border-gray-800 bg-[#0b1020] p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_260px] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                    {item.mandatory ? <Badge color="blue">Mandatory</Badge> : <Badge color="gray">Optional</Badge>}
                    {item.approval_required ? <Badge color="yellow">Approval</Badge> : <Badge color="green">Auto accept</Badge>}
                  </div>
                  <p className="mt-2 text-gray-400">{item.department || "All departments"}{item.role ? ` · ${item.role}` : ""}</p>
                  <p className="mt-3 text-gray-500">Due {item.due_days_before_joining} days before joining · reminder every {item.reminder_days} days · max {item.max_file_size_mb} MB</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => edit(item)}
                    className={`${actionButton} border-gray-800 text-gray-300 hover:bg-gray-900`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className={`${actionButton} border-red-900/70 text-red-300 hover:bg-red-950/40`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
