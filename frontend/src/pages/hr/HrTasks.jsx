import { useEffect, useMemo, useState } from "react";
import { hrApi } from "../../services/api";
import { Badge, Button, Input } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const emptyForm = {
  title: "",
  description: "",
  department: "All",
  status: "published",
  mandatory: false,
  content_type: "video",
  duration_minutes: 15,
  link_url: "",
  file: null,
};

export default function HrTasks() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () =>
    hrApi
      .listTasks()
      .then((res) => setTasks(res.data?.tasks ?? []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === "All" ? tasks : tasks.filter((task) => task.status === filter)),
    [filter, tasks]
  );

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
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, duration_minutes: Number(form.duration_minutes) || 15 };
      if (editingId) await hrApi.updateTask(editingId, payload);
      else await hrApi.createTask(payload);
      reset();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const edit = (task) => {
    setEditingId(task.id);
    setForm({
      title: task.title ?? "",
      description: task.description ?? "",
      department: task.department ?? "All",
      status: task.status ?? "published",
      mandatory: Boolean(task.mandatory),
      content_type: task.content_type ?? "video",
      duration_minutes: task.duration_minutes ?? 15,
      link_url: task.link_url ?? task.file_url ?? "",
      file: null,
    });
  };

  const updateStatus = async (task, status) => {
    await hrApi.updateTask(task.id, { status });
    await load();
  };

  const remove = async (id) => {
    await hrApi.deleteTask(id);
    await load();
  };

  const actionButton =
    "h-10 w-24 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-[1400px] space-y-6">
      <section className="rounded-xl border border-gray-800 bg-[#0b1020] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge color="blue">Tasks</Badge>
            <h2 className="mt-3 text-2xl font-semibold text-white">Onboarding Tasks</h2>
            <p className="mt-1 text-gray-400">
              Create overall tasks or department-wise tasks. Published tasks appear in the employee Learning section.
            </p>
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-12 rounded-lg border border-gray-800 bg-gray-950/60 px-4 text-white outline-none">
            <option>All</option>
            <option>published</option>
            <option>draft</option>
            <option>archived</option>
          </select>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form onSubmit={save} className="rounded-xl border border-gray-800 bg-[#0b1020] p-5">
          <h3 className="mb-4 text-lg font-semibold text-white">{editingId ? "Edit Task" : "Create Task"}</h3>
          <div className="space-y-4">
            <Input label="Title" value={form.title} onChange={set("title")} required />
            <Input label="Description" value={form.description} onChange={set("description")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Department" value={form.department} onChange={set("department")} />
              <Input label="Duration Minutes" type="number" value={form.duration_minutes} onChange={set("duration_minutes")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="block font-medium text-gray-200">Status</span>
                <select value={form.status} onChange={set("status")} className="w-full rounded-lg border border-gray-700 bg-gray-950/80 px-3.5 py-2.5 text-white outline-none">
                  <option>published</option>
                  <option>draft</option>
                  <option>archived</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="block font-medium text-gray-200">Content Type</span>
                <select value={form.content_type} onChange={set("content_type")} className="w-full rounded-lg border border-gray-700 bg-gray-950/80 px-3.5 py-2.5 text-white outline-none">
                  <option>video</option>
                  <option>pdf</option>
                  <option>image</option>
                  <option>link</option>
                </select>
              </label>
            </div>
            <label className="flex items-center gap-3 text-gray-300">
              <input checked={form.mandatory} onChange={set("mandatory")} type="checkbox" className="h-4 w-4 accent-brand-600" />
              Mandatory for candidates
            </label>
            {form.content_type === "link" ? (
              <Input label="Learning Link" type="url" value={form.link_url} onChange={set("link_url")} placeholder="https://..." required />
            ) : (
              <label className="block rounded-xl border border-dashed border-gray-700 bg-gray-950/60 p-4 transition hover:border-gray-500">
                <span className="block font-medium text-gray-200">Upload {form.content_type.toUpperCase()}</span>
                <span className="mt-1 block text-sm text-gray-500">
                  HR can publish videos, PDFs, and image files. Published content appears in Employee Learning.
                </span>
                <input
                  type="file"
                  accept={form.content_type === "video" ? ".mp4,.webm,.mov,.avi" : form.content_type === "pdf" ? ".pdf" : ".png,.jpg,.jpeg,.webp,.gif"}
                  className="mt-3 block w-full cursor-pointer rounded-lg border border-gray-700 bg-gray-900 text-sm text-gray-300 file:mr-4 file:border-0 file:bg-brand-700 file:px-4 file:py-2.5 file:font-semibold file:text-white hover:file:bg-brand-600"
                  onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))}
                />
                {form.file ? <span className="mt-2 block text-sm text-green-300">Selected: {form.file.name}</span> : null}
              </label>
            )}
            <div className="flex gap-3">
              <Button type="submit" loading={saving} className="flex-1">
                {editingId ? "Save Changes" : "Create Task"}
              </Button>
              {editingId ? <Button type="button" variant="secondary" onClick={reset}>Cancel</Button> : null}
            </div>
          </div>
        </form>

        <div className="rounded-xl border border-gray-800 bg-[#0b1020] p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Previous Tasks Created</h3>
              <p className="mt-1 text-gray-400">Review, edit, publish, or remove tasks already created by HR.</p>
            </div>
            <Badge color="gray">{filtered.length} tasks</Badge>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950/50 p-8 text-center text-gray-400">
              No previous tasks found for this filter.
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((task) => (
                <article key={task.id} className="rounded-xl border border-gray-800 bg-gray-950/50 p-5">
                  <div className="grid gap-4 lg:grid-cols-[1fr_260px] lg:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                        <Badge color={task.status === "published" ? "green" : task.status === "draft" ? "yellow" : "gray"}>{task.status}</Badge>
                        {task.mandatory ? <Badge color="blue">Mandatory</Badge> : <Badge color="gray">Optional</Badge>}
                      </div>
                      <p className="mt-2 text-gray-400">{task.description || "No description added."}</p>
                      <p className="mt-3 text-gray-500">{task.department} · {task.content_type} · {task.duration_minutes} min</p>
                      {task.file_name || task.file_url || task.link_url ? (
                        <p className="mt-2 text-sm text-gray-400">Source: {task.file_name || task.link_url || task.file_url}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => updateStatus(task, "published")}
                        disabled={task.status === "published"}
                        className={`${actionButton} border-[#6B7A68]/50 bg-[#2E302F] text-white hover:bg-[#1C231F]`}
                      >
                        {task.status === "published" ? "Published" : "Publish"}
                      </button>
                      <button
                        type="button"
                        onClick={() => edit(task)}
                        className={`${actionButton} border-gray-800 text-gray-300 hover:bg-gray-900`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(task.id)}
                        className={`${actionButton} border-red-900/70 text-red-300 hover:bg-red-950/40`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
                </div>
      </section>
    </div>
  );
}
