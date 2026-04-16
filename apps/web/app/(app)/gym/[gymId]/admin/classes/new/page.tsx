"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";

export default function ManageClassesPage() {
  const { gymId } = useParams();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    capacity: "",
    duration_minutes: "60",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClasses();
  }, [gymId]);

  async function loadClasses() {
    if (!gymId) return;
    try {
      const data = await apiFetch(`/gyms/${gymId}/classes`);
      setClasses(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/gyms/${gymId}/classes`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          capacity: form.capacity ? parseInt(form.capacity) : null,
          duration_minutes: parseInt(form.duration_minutes) || 60,
        }),
      });
      setShowForm(false);
      setForm({ name: "", description: "", capacity: "", duration_minutes: "60" });
      loadClasses();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(classId: string) {
    if (!confirm("Delete this class?")) return;
    try {
      await apiFetch(`/gyms/${gymId}/classes/${classId}`, { method: "DELETE" });
      loadClasses();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleGenerateOccurrences() {
    try {
      const today = new Date();
      const start = today.toISOString().split("T")[0];
      const end = new Date(today.getTime() + 28 * 86400000).toISOString().split("T")[0];
      const result = await apiFetch(`/gyms/${gymId}/generate-occurrences`, {
        method: "POST",
        body: JSON.stringify({ start_date: start, end_date: end }),
      });
      alert(`Generated ${result?.length || 0} class occurrences for the next 4 weeks.`);
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <p className="text-[var(--color-ink-soft)]">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <BackButton href={`/gym/${gymId}`} label="Gym" className="mb-3" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight text-[var(--color-ink)]">Manage Classes</h1>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateOccurrences}
            className="h-9 px-3 rounded-md border border-[var(--color-rule-strong)] text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium hover:bg-[var(--color-bg-soft)]"
          >
            Generate Schedule
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`h-9 px-3 rounded-md text-[11px] tracking-[0.12em] uppercase font-medium ${
              showForm
                ? "border border-[var(--color-rule-strong)] hover:bg-[var(--color-bg-soft)]"
                : "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-rich)]"
            }`}
          >
            {showForm ? "Cancel" : "New Class"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4 p-4 border border-[var(--color-rule)] rounded-xl">
          <h3 className="text-lg font-semibold mb-3">Create Class</h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="class-name" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Class Name</label>
              <input
                id="class-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 rounded-md border border-[var(--color-rule-strong)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="class-desc" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Description</label>
              <input
                id="class-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-10 rounded-md border border-[var(--color-rule-strong)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="class-capacity" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Capacity (empty = unlimited)</label>
                <input
                  id="class-capacity"
                  inputMode="numeric"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="h-10 rounded-md border border-[var(--color-rule-strong)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="class-duration" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Duration (minutes)</label>
                <input
                  id="class-duration"
                  inputMode="numeric"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                  className="h-10 rounded-md border border-[var(--color-rule-strong)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-md bg-[var(--color-accent)] text-white text-[11px] tracking-[0.12em] uppercase font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-70"
            >
              {saving ? "Creating..." : "Create Class"}
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {classes.map((cls) => (
          <div key={cls.id} className="border border-[var(--color-rule)] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">{cls.name}</h3>
                <p className="text-sm text-[var(--color-ink-soft)]">
                  {cls.duration_minutes}min
                  {cls.capacity && ` · ${cls.capacity} spots`}
                  {cls.default_coach && ` · Coach: ${cls.default_coach.first_name} ${cls.default_coach.last_name}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/gym/${gymId}/admin/classes/${cls.id}/edit`}
                  className="h-8 px-2 inline-flex items-center rounded text-sm text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] no-underline"
                >
                  Schedule
                </Link>
                <Link
                  href={`/gym/${gymId}/admin/classes/${cls.id}/check-in`}
                  className="h-8 px-2 inline-flex items-center rounded text-sm text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] no-underline"
                >
                  Check-in
                </Link>
                <button
                  onClick={() => handleDelete(cls.id)}
                  className="h-8 px-2 rounded text-sm text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <p className="text-center text-[var(--color-ink-soft)] py-6">No classes created yet.</p>
        )}
      </div>
    </div>
  );
}
