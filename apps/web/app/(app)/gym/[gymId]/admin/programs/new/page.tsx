"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

  if (loading) return <p className="text-gray-600">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <BackButton href={`/gym/${gymId}?tab=programs`} label="Gym" className="mb-3" />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Programs</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create programs and manage their workout calendars
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="h-9 px-3 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90"
        >
          {showForm ? "Cancel" : "New Program"}
        </button>
      </div>

      {showForm && (
        <div className="mb-5 p-6 border border-gray-200 rounded-xl">
          <h3 className="text-base font-semibold mb-3">Create Program</h3>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Program Name</label>
              <input
                className="h-11 rounded-md border border-gray-300 px-3 text-sm"
                placeholder="e.g. Strength & Conditioning"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <textarea
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="What this program is about, who it's for, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 rounded-md border border-gray-300 px-3 text-sm bg-white"
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-sm font-medium">End Date (optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 rounded-md border border-gray-300 px-3 text-sm bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  setName("");
                  setDescription("");
                }}
                className="h-9 px-3 rounded-md text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !name.trim()}
                className="h-9 px-3 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
              >
                {saving ? "Creating..." : "Create & Edit Calendar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {programs.length === 0 && !showForm ? (
        <div className="border border-gray-200 rounded-xl p-10">
          <div className="flex flex-col items-center gap-3">
            <p className="text-gray-600 text-center">
              No programs yet. Create your first program to start adding workouts.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="h-10 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90"
            >
              Create Program
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {programs.map((program) => {
            const isEditing = editingId === program.id;

            if (isEditing) {
              return (
                <div
                  key={program.id}
                  className="border-2 border-blue-400 bg-blue-50 rounded-xl p-4"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Name</label>
                      <input
                        className="h-10 rounded-md border border-gray-300 px-3 text-sm bg-white"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Description</label>
                      <textarea
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="h-8 px-3 rounded text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdate(program.id)}
                        disabled={saving || !editName.trim()}
                        className="h-8 px-3 rounded bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={program.id}
                className="border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
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
                  <div className="flex gap-2 items-center">
                    <Link
                      href={`/gym/${gymId}/admin/programs/${program.id}/edit`}
                      className="h-9 px-3 inline-flex items-center rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 no-underline text-gray-900"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => {
                        setEditingId(program.id);
                        setEditName(program.name);
                        setEditDescription(program.description || "");
                      }}
                      className="h-9 px-3 rounded-md text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(program.id)}
                      className="h-9 px-3 rounded-md text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Delete
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
