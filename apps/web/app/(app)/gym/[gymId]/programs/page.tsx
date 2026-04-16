"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";

export default function ProgramsPage() {
  const { gymId } = useParams();
  const router = useRouter();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!gymId) return;
    apiFetch(`/gyms/${gymId}/programs`)
      .then((data) => setPrograms(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));

    apiFetch(`/gyms/${gymId}/members`)
      .then(() => setIsAdmin(true))
      .catch(() => setIsAdmin(false));
  }, [gymId]);

  async function handleEnroll(programId: string) {
    try {
      await apiFetch(`/gyms/${gymId}/programs/${programId}/enroll`, { method: "POST" });
      const data = await apiFetch(`/gyms/${gymId}/programs`);
      setPrograms(data);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const created = await apiFetch(`/gyms/${gymId}/programs`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        }),
      });
      setShowForm(false);
      setForm({ name: "", description: "", start_date: "", end_date: "" });
      if (created?.id) {
        router.push(`/gym/${gymId}/admin/programs/${created.id}/edit`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-600">Loading...</p>;

  return (
    <div>
      <BackButton href={`/gym/${gymId}`} label="Gym" className="mb-3" />
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Programs</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="h-9 px-3 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90"
          >
            {showForm ? "Cancel" : "Add Program"}
          </button>
        )}
      </div>

      {showForm && (
        <div className="border border-gray-200 rounded-xl p-6 mb-5">
          <h3 className="text-base font-semibold mb-3">New Program</h3>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Program Name</label>
              <input
                className="h-11 rounded-md border border-gray-300 px-3 text-sm"
                placeholder="e.g. Strength & Conditioning"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <textarea
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="What this program is about, who it's for, etc."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="h-11 rounded-md border border-gray-300 px-3 text-sm bg-white"
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-sm font-medium">End Date (optional)</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="h-11 rounded-md border border-gray-300 px-3 text-sm bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  setForm({ name: "", description: "", start_date: "", end_date: "" });
                }}
                className="h-9 px-3 rounded-md text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name.trim()}
                className="h-9 px-3 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
              >
                {saving ? "Creating..." : "Create Program"}
              </button>
            </div>
          </div>
        </div>
      )}

      {programs.length === 0 && !showForm ? (
        <div className="border border-gray-200 rounded-xl p-10">
          <div className="flex flex-col items-center gap-3">
            <p className="text-gray-600 text-center">No programs available yet.</p>
            {isAdmin && (
              <button
                onClick={() => setShowForm(true)}
                className="h-10 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90"
              >
                Create Program
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {programs.map((program) => (
            <div
              key={program.id}
              className="border border-[var(--color-rule)] rounded-xl p-4 bg-[var(--color-bg-card)] hover:border-[var(--color-ink-faint)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <Link
                  href={`/gym/${gymId}/programs/${program.id}`}
                  className="flex-1 no-underline"
                >
                  <div>
                    <h3 className="text-base font-semibold">{program.name}</h3>
                    {program.description && (
                      <p className="text-sm text-gray-600 mt-1">{program.description}</p>
                    )}
                    {(program.start_date || program.end_date) && (
                      <div className="flex gap-2 mt-1">
                        {program.start_date && (
                          <span className="text-xs text-gray-500">
                            Starts:{" "}
                            {new Date(program.start_date + "T00:00:00").toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                        )}
                        {program.end_date ? (
                          <span className="text-xs text-gray-500">
                            Ends:{" "}
                            {new Date(program.end_date + "T00:00:00").toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                        ) : program.start_date ? (
                          <span className="text-xs text-gray-500">Ongoing</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex gap-2 ml-3">
                  <button
                    onClick={() => handleEnroll(program.id)}
                    className="h-9 px-3 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90"
                  >
                    Enroll
                  </button>
                  {isAdmin && (
                    <Link
                      href={`/gym/${gymId}/admin/programs/${program.id}/edit`}
                      className="inline-flex items-center h-9 px-3 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 no-underline text-gray-900"
                    >
                      Manage
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
