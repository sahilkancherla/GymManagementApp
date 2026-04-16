"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";

export default function ManageProgramsPage() {
  const { gymId } = useParams();
  const router = useRouter();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    loadPrograms();
  }, [gymId]);

  async function loadPrograms() {
    if (!gymId) return;
    try {
      const data = await apiFetch(`/gyms/${gymId}/programs`);
      setPrograms(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await apiFetch(`/gyms/${gymId}/programs`, {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || null,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      });
      setShowForm(false);
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      loadPrograms();
      if (created?.id) {
        router.push(`/gym/${gymId}/admin/programs/${created.id}/edit`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(programId: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/gyms/${gymId}/programs/${programId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          description: editDescription || null,
        }),
      });
      setEditingId(null);
      loadPrograms();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(programId: string) {
    if (!confirm("Delete this program and all its workouts? This cannot be undone.")) return;
    try {
      await apiFetch(`/gyms/${gymId}/programs/${programId}`, { method: "DELETE" });
      loadPrograms();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <p className="text-[13px] text-[var(--color-ink-soft)]">Loading…</p>;

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="max-w-3xl">
      <BackButton href={`/gym/${gymId}?tab=programs`} label="Programs" className="mb-4" />

      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight text-[var(--color-ink)]">
            Programs
          </h1>
          <p className="text-[13px] text-[var(--color-ink-soft)] mt-1">
            Create programs and manage their workout calendars.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.25} />
            New program
          </button>
        )}
      </header>

      {showForm && (
        <div className="mb-5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-5">
          <h3 className="text-[13px] font-semibold text-[var(--color-ink)] mb-4">Create Program</h3>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Program name</label>
              <input
                className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                placeholder="e.g. Strength & Conditioning"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                Description <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                className="rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                placeholder="What this program is about, who it's for, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                  End date <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setShowForm(false);
                  setName("");
                  setDescription("");
                }}
                className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !name.trim()}
                className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
              >
                {saving ? "Creating…" : "Create & continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {programs.length === 0 && !showForm ? (
        <div className="border border-[var(--color-rule)] rounded-xl p-12 text-center">
          <p className="text-[13px] text-[var(--color-ink-muted)] mb-4">
            No programs yet. Create your first program to start adding workouts.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.25} />
            Create program
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {programs.map((program) => {
            const isEditing = editingId === program.id;

            if (isEditing) {
              return (
                <div
                  key={program.id}
                  className="border border-[var(--color-accent-rule)] bg-[var(--color-bg-card)] rounded-xl p-5 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Name</label>
                      <input
                        className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Description</label>
                      <textarea
                        className="rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdate(program.id)}
                        disabled={saving || !editName.trim()}
                        className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            const dateRange = program.start_date
              ? program.end_date
                ? `${fmtDate(program.start_date)} — ${fmtDate(program.end_date)}`
                : `${fmtDate(program.start_date)} — Ongoing`
              : null;

            return (
              <div
                key={program.id}
                className="group border border-[var(--color-rule)] rounded-xl p-5 bg-[var(--color-bg-card)] hover:border-[var(--color-rule-strong)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {dateRange && (
                      <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] tabular-nums mb-1">
                        {dateRange}
                      </div>
                    )}
                    <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{program.name}</h3>
                    {program.description && (
                      <p className="text-[13px] text-[var(--color-ink-soft)] mt-1 line-clamp-2">{program.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 items-center shrink-0">
                    <Link
                      href={`/gym/${gymId}/admin/programs/${program.id}/edit`}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-[var(--color-rule)] text-[12px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors no-underline"
                    >
                      Manage
                      <ArrowUpRight size={12} strokeWidth={1.75} />
                    </Link>
                    <button
                      onClick={() => {
                        setEditingId(program.id);
                        setEditName(program.name);
                        setEditDescription(program.description || "");
                      }}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
                      title="Rename"
                    >
                      <Pencil size={13} strokeWidth={1.75} />
                    </button>
                    <button
                      onClick={() => handleDelete(program.id)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={13} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
