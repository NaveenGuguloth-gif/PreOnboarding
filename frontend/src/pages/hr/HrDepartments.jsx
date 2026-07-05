import { useEffect, useMemo, useState } from "react";
import { hrApi } from "../../services/api";
import { Badge, Button, Input } from "../../components/ui";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const emptyForm = { name: "", manager_name: "", department_hr: "" };

export default function HrDepartments() {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () =>
    hrApi
      .listDepartments()
      .then((res) => setDepartments(res.data?.departments ?? []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return departments.filter((department) =>
      `${department.name} ${department.manager_name} ${department.department_hr}`.toLowerCase().includes(term)
    );
  }, [departments, query]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const reset = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) await hrApi.updateDepartment(editingId, form);
      else await hrApi.createDepartment(form);
      reset();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const edit = (department) => {
    setEditingId(department.id);
    setForm({
      name: department.name ?? "",
      manager_name: department.manager_name ?? "",
      department_hr: department.department_hr ?? "",
    });
  };

  const remove = async (id) => {
    await hrApi.deleteDepartment(id);
    await load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-[1400px] space-y-6">
      <section className="rounded-xl border border-gray-800 bg-[#0b1020] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge color="blue">Departments</Badge>
            <h2 className="mt-3 text-2xl font-semibold text-white">Department Setup</h2>
            <p className="mt-1 text-gray-400">Manage department owners and HR contacts for onboarding workflows.</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-12 rounded-lg border border-gray-800 bg-gray-950/60 px-4 text-white outline-none focus:border-brand-600 lg:w-80"
            placeholder="Search departments"
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <form onSubmit={save} className="rounded-xl border border-gray-800 bg-[#0b1020] p-5">
          <h3 className="mb-4 text-lg font-semibold text-white">{editingId ? "Edit Department" : "Add Department"}</h3>
          <div className="space-y-4">
            <Input label="Department Name" value={form.name} onChange={set("name")} required />
            <Input label="Manager Name" value={form.manager_name} onChange={set("manager_name")} />
            <Input label="Department HR" value={form.department_hr} onChange={set("department_hr")} />
            <div className="flex gap-3">
              <Button type="submit" loading={saving} className="flex-1">
                {editingId ? "Save Changes" : "Create Department"}
              </Button>
              {editingId ? (
                <Button type="button" variant="secondary" onClick={reset}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </form>

        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#0b1020]">
          <table className="w-full min-w-[980px] text-base">
            <thead className="border-b border-gray-800 text-left text-sm uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Manager</th>
                <th className="px-5 py-4">HR Owner</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {filtered.map((department) => (
                <tr key={department.id} className="hover:bg-gray-900/60">
                  <td className="px-5 py-4 font-medium text-white">{department.name}</td>
                  <td className="px-5 py-4 text-gray-300">{department.manager_name || "—"}</td>
                  <td className="px-5 py-4 text-gray-300">{department.department_hr || "—"}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-lg border border-gray-800 px-3 py-2 text-gray-300 hover:bg-gray-900" onClick={() => edit(department)} type="button">
                        Edit
                      </button>
                      <button className="rounded-lg border border-red-900/70 px-3 py-2 text-red-300 hover:bg-red-950/40" onClick={() => remove(department.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
