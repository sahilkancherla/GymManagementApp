"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  formatUtcTime,
  formatUtcTimePlusMinutes,
  isClassCompleted,
  localHHMMToUtcHHMMSS,
  utcHHMMSSToLocalHHMM,
} from "@/lib/utils";

export function ClassOccurrenceModal({
  cls,
  date,
  currentUserId,
  canManage,
  members,
  onClose,
}: {
  cls: any;
  date: string;
  currentUserId: string | null;
  canManage: boolean;
  members: any[];
  onClose: () => void;
}) {
  const [occurrence, setOccurrence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const programId: string | undefined = cls.program_id || cls.program?.id;
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(true);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [workoutForm, setWorkoutForm] = useState({
    title: "",
    description: "",
    format: "time" as "time" | "amrap",
    applyToAll: false,
  });
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  // Map<workoutId, Map<userId, stat>>
  const [statsByWorkout, setStatsByWorkout] = useState<Record<string, Record<string, any>>>({});
  // Expanded-results state keyed by signup id.
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"workouts" | "signups" | "settings">("signups");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/classes/${cls.id}/occurrences`, {
        method: "POST",
        body: JSON.stringify({ date }),
      });
      setOccurrence(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load class");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls.id, date]);

  async function loadWorkouts() {
    if (!programId) {
      setWorkoutsLoading(false);
      return;
    }
    setWorkoutsLoading(true);
    try {
      const data = await apiFetch(
        `/programs/${programId}/workouts?start=${date}&end=${date}`,
      );
      const relevant = (data || []).filter((w: any) => {
        const ids: string[] = w.class_ids || [];
        return ids.length === 0 || ids.includes(cls.id);
      });
      setWorkouts(relevant);
    } catch (err) {
      console.error(err);
    } finally {
      setWorkoutsLoading(false);
    }
  }

  useEffect(() => {
    loadWorkouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, cls.id, date]);

  // Load stats for all visible workouts into a (workoutId → userId → stat) map.
  async function loadStatsForWorkouts(ws: any[]) {
    if (!ws.length) {
      setStatsByWorkout({});
      return;
    }
    try {
      const results = await Promise.all(
        ws.map(async (w) => {
          try {
            const data = await apiFetch(`/workouts/${w.id}/stats`);
            return [w.id, data || []] as const;
          } catch {
            return [w.id, []] as const;
          }
        }),
      );
      const map: Record<string, Record<string, any>> = {};
      for (const [workoutId, stats] of results) {
        const userMap: Record<string, any> = {};
        for (const s of stats as any[]) userMap[s.user_id] = s;
        map[workoutId] = userMap;
      }
      setStatsByWorkout(map);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadStatsForWorkouts(workouts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts]);

  function upsertStatInCache(workoutId: string, stat: any) {
    setStatsByWorkout((prev) => ({
      ...prev,
      [workoutId]: { ...(prev[workoutId] || {}), [stat.user_id]: stat },
    }));
  }

  function removeStatFromCache(workoutId: string, userId: string) {
    setStatsByWorkout((prev) => {
      const bucket = { ...(prev[workoutId] || {}) };
      delete bucket[userId];
      return { ...prev, [workoutId]: bucket };
    });
  }

  async function handleAddWorkout() {
    if (!programId || !workoutForm.title.trim()) return;
    setSavingWorkout(true);
    setError(null);
    try {
      await apiFetch(`/programs/${programId}/workouts`, {
        method: "POST",
        body: JSON.stringify({
          date,
          title: workoutForm.title.trim(),
          description: workoutForm.description.trim() || null,
          format: workoutForm.format,
          sort_order: workouts.length,
          class_ids: workoutForm.applyToAll ? [] : [cls.id],
        }),
      });
      setWorkoutForm({ title: "", description: "", format: "time", applyToAll: false });
      setShowWorkoutForm(false);
      await loadWorkouts();
    } catch (err: any) {
      setError(err?.message || "Failed to add workout");
    } finally {
      setSavingWorkout(false);
    }
  }

  async function handleDeleteWorkout(workoutId: string) {
    if (!confirm("Delete this workout?")) return;
    setError(null);
    try {
      await apiFetch(`/workouts/${workoutId}`, { method: "DELETE" });
      await loadWorkouts();
    } catch (err: any) {
      setError(err?.message || "Failed to delete workout");
    }
  }

  // Turn a program-wide workout into one scoped only to this class.
  async function handleOverrideForThisClass(w: any) {
    if (!confirm(
      `Scope "${w.title}" to just this class? It will no longer appear for other classes in this program on this day.`,
    )) return;
    setError(null);
    try {
      await apiFetch(`/workouts/${w.id}`, {
        method: "PUT",
        body: JSON.stringify({ class_ids: [cls.id] }),
      });
      await loadWorkouts();
    } catch (err: any) {
      setError(err?.message || "Failed to override workout");
    }
  }

  async function handleEditWorkout(
    w: any,
    update: {
      title: string;
      description: string | null;
      format: "time" | "amrap";
      applyToAll: boolean;
    },
  ) {
    setError(null);
    try {
      await apiFetch(`/workouts/${w.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: update.title,
          description: update.description,
          format: update.format,
          class_ids: update.applyToAll ? [] : [cls.id],
        }),
      });
      await loadWorkouts();
    } catch (err: any) {
      setError(err?.message || "Failed to update workout");
      throw err;
    }
  }

  const signups: any[] = occurrence?.signups || [];
  const capacity: number | null = cls.capacity ?? occurrence?.class?.capacity ?? null;
  const atCapacity = capacity != null && signups.length >= capacity;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err: any) {
      setError(err?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function signUpMember(userId: string) {
    if (!occurrence || !userId) return;
    await run(async () => {
      await apiFetch(`/occurrences/${occurrence.id}/signup`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
      setMemberSearch("");
    });
  }

  async function removeSignup(signupId: string) {
    await run(async () => {
      await apiFetch(`/class-signups/${signupId}`, { method: "DELETE" });
    });
  }

  async function updateOccurrence(update: { coach_id?: string | null; is_cancelled?: boolean }) {
    if (!occurrence) return;
    await run(async () => {
      await apiFetch(`/occurrences/${occurrence.id}`, {
        method: "PUT",
        body: JSON.stringify(update),
      });
    });
  }

  async function handleDeleteOccurrence() {
    if (!occurrence) return;
    if (!confirm(
      "Delete this class occurrence? The recurring class stays; only this one is cancelled.",
    )) return;
    await updateOccurrence({ is_cancelled: true });
  }

  async function handleRestoreOccurrence() {
    if (!occurrence) return;
    await updateOccurrence({ is_cancelled: false });
  }

  async function checkIn(signupId: string) {
    if (!occurrence) return;
    await run(async () => {
      await apiFetch(`/occurrences/${occurrence.id}/check-in/${signupId}`, { method: "POST" });
    });
  }

  async function undoCheckIn(signupId: string) {
    if (!occurrence) return;
    await run(async () => {
      await apiFetch(`/occurrences/${occurrence.id}/check-in/${signupId}`, {
        method: "DELETE",
      });
    });
  }

  // Members not yet signed up (for admin add-member select)
  const signedUpIds = new Set(signups.map((s) => s.user_id));
  const availableMembers = (members || []).filter(
    (m: any) => m.status === "active" && m.user_id && !signedUpIds.has(m.user_id),
  );

  // Members who can coach (admin or coach role) — for per-occurrence override
  const coachCandidates = (members || []).filter((m: any) => {
    if (m.status !== "active" || !m.user_id) return false;
    const roles: string[] = m.roles || (m.role ? [m.role] : []);
    return roles.includes("coach") || roles.includes("admin");
  });
  const occurrenceCoachId: string | null = occurrence?.coach_id ?? null;
  const defaultCoachId: string | null = cls.coach?.id ?? cls.coach_id ?? null;
  const isCancelled = !!occurrence?.is_cancelled;
  const isCompleted =
    !isCancelled &&
    isClassCompleted(
      date,
      occurrence?.start_time ?? cls.start_time,
      cls.duration_minutes,
    );

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const effectiveStartTime: string | null =
    occurrence?.start_time ?? cls.start_time ?? null;
  const timeLabel = effectiveStartTime
    ? `${formatUtcTime(effectiveStartTime, date)}${
        cls.duration_minutes
          ? ` – ${formatUtcTimePlusMinutes(effectiveStartTime, cls.duration_minutes, date)}`
          : ""
      }`
    : "No time set";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,10,10,0.45)] backdrop-blur-sm p-4 animate-[fadeIn_120ms_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-4xl bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-rule)] shadow-[var(--shadow-lifted)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[var(--color-bg-card)] border-b border-[var(--color-rule)]">
          <div className="flex items-start justify-between gap-4 px-6 py-5">
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-medium tracking-[0.14em] uppercase text-[var(--color-ink-muted)] mb-1.5">
                Class occurrence
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-[22px] leading-tight font-semibold tracking-tight text-[var(--color-ink)] truncate">
                  {cls.name}
                </h3>
                {isCancelled && (
                  <span className="inline-flex items-center h-5 px-2 rounded-full bg-[var(--color-danger-soft)] text-[var(--color-danger)] text-[10.5px] font-semibold uppercase tracking-wide border border-[#fecaca]">
                    Cancelled
                  </span>
                )}
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] text-[10.5px] font-semibold uppercase tracking-wide border border-[var(--color-accent-rule)]">
                    <span>✓</span> Completed
                  </span>
                )}
              </div>
              <p className="text-[12.5px] text-[var(--color-ink-soft)] mt-2 tabular-nums">
                <span className="text-[var(--color-ink)]">{dateLabel}</span>
                <span className="mx-1.5 text-[var(--color-ink-faint)]">·</span>
                <span>{timeLabel}</span>
                {cls.program?.name && (
                  <>
                    <span className="mx-1.5 text-[var(--color-ink-faint)]">·</span>
                    <span>{cls.program.name}</span>
                  </>
                )}
              </p>

              <div className="text-[12px] mt-2 flex items-center gap-2">
                <span className="text-[var(--color-ink-muted)]">Coach</span>
                <span className="h-3 w-px bg-[var(--color-rule)]" />
                {occurrence?.coach ? (
                  <span className="text-[var(--color-ink)] font-medium">
                    {occurrence.coach.first_name} {occurrence.coach.last_name}
                    {defaultCoachId &&
                      occurrenceCoachId !== defaultCoachId && (
                        <span className="ml-1.5 inline-flex items-center h-4 px-1.5 rounded-sm bg-[var(--color-bg-soft)] text-[var(--color-ink-muted)] text-[10px] font-medium uppercase tracking-wide border border-[var(--color-rule)]">
                          Override
                        </span>
                      )}
                  </span>
                ) : cls.coach ? (
                  <span className="text-[var(--color-ink)] font-medium">
                    {cls.coach.first_name} {cls.coach.last_name}
                  </span>
                ) : (
                  <span className="text-[var(--color-ink-muted)]">
                    Unassigned
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-strong)] hover:bg-[var(--color-bg-soft)] text-[18px] leading-none flex items-center justify-center flex-shrink-0 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {isCancelled && (
            <div className="px-6 py-2.5 bg-[var(--color-danger-soft)] border-t border-[#fecaca] text-[12px] text-[var(--color-danger)]">
              This class is cancelled for this day. Sign-ups are disabled. The
              recurring class itself is unchanged.
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-1 px-6 border-t border-[var(--color-rule)]">
            {([
              {
                key: "signups",
                label: "Sign-ups",
                count: occurrence?.signups?.length ?? 0,
              },
              { key: "workouts", label: "Workouts", count: workouts.length },
              ...(canManage
                ? ([{ key: "settings", label: "Settings", count: null }] as const)
                : []),
            ] as {
              key: "signups" | "workouts" | "settings";
              label: string;
              count: number | null;
            }[]).map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`relative px-3 h-11 text-[13px] transition-colors ${
                    active
                      ? "text-[var(--color-accent-ink)] font-medium"
                      : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {t.label}
                    {t.count != null && (
                      <span
                        className={`inline-flex items-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10.5px] font-medium tabular-nums border ${
                          active
                            ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                            : "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] border-[var(--color-rule)]"
                        }`}
                      >
                        {t.count}
                      </span>
                    )}
                  </span>
                  {active && (
                    <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-[var(--color-accent)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-[13px] text-[var(--color-ink-muted)]">
            Loading…
          </div>
        ) : (
          <div className="px-6 py-5 flex flex-col gap-4">
            {tab === "signups" && (() => {
              const pending = signups.filter((s) => !s.checked_in);
              const checkedIn = signups.filter((s) => s.checked_in);

              const q = memberSearch.trim().toLowerCase();
              const matches = canManage
                ? (q
                    ? availableMembers.filter((m: any) => {
                        const name = `${m.profile?.first_name || ""} ${
                          m.profile?.last_name || ""
                        }`.trim().toLowerCase();
                        return name.includes(q);
                      })
                    : availableMembers)
                : [];

              return (
                <>
                  {/* Admin: sign up another member */}
                  {canManage && (
                    <div className="rounded-lg border border-[var(--color-rule)] bg-white p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-sm font-semibold text-[var(--color-ink)]">
                          Sign up a member
                        </div>
                        {atCapacity && (
                          <span className="text-xs text-amber-700">
                            (class is full)
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <svg
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-muted)]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                          type="text"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder={
                            availableMembers.length === 0
                              ? "No members available"
                              : "Search members by name..."
                          }
                          disabled={busy || atCapacity || availableMembers.length === 0}
                          className="h-9 w-full rounded-md border border-[var(--color-rule-strong)] bg-white pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-[var(--color-bg-sunken)] disabled:text-[var(--color-ink-muted)]"
                        />
                      </div>
                      {q && matches.length > 0 && (
                        <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-[var(--color-rule)] divide-y divide-[var(--color-rule)]">
                          {matches.map((m: any) => {
                            const name = `${m.profile?.first_name || ""} ${
                              m.profile?.last_name || ""
                            }`.trim() || "Member";
                            return (
                              <button
                                key={m.user_id}
                                type="button"
                                onClick={() => signUpMember(m.user_id)}
                                disabled={busy || atCapacity}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-sunken)] disabled:opacity-60"
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <Avatar profile={m.profile} size={28} />
                                  <span className="truncate">{name}</span>
                                </span>
                                <span className="text-xs text-primary font-medium">+ Add</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {q && matches.length === 0 && (
                        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                          No members match &ldquo;{memberSearch}&rdquo;.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Roster */}
                  {signups.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--color-rule-strong)] py-10 text-center">
                      <p className="text-sm text-[var(--color-ink-muted)]">No one has signed up yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {pending.length > 0 && (
                        <SignupSection
                          title="Pending"
                          count={pending.length}
                          accent="gray"
                        >
                          {pending.map((s) => (
                            <SignupRow
                              key={s.id}
                              signup={s}
                              isSelf={s.user_id === currentUserId}
                              canManage={canManage}
                              busy={busy}
                              onCheckIn={() => checkIn(s.id)}
                              onRemove={() => removeSignup(s.id)}
                            />
                          ))}
                        </SignupSection>
                      )}
                      {checkedIn.length > 0 && (
                        <SignupSection
                          title="Checked in"
                          count={checkedIn.length}
                          accent="green"
                        >
                          {checkedIn.map((s) => {
                            const name = `${s.profile?.first_name || ""} ${
                              s.profile?.last_name || ""
                            }`.trim() || "Member";
                            const isExpanded = !!expandedResults[s.id];
                            return (
                              <div key={s.id}>
                                <SignupRow
                                  signup={s}
                                  isSelf={s.user_id === currentUserId}
                                  canManage={canManage}
                                  busy={busy}
                                  isResultsExpanded={isExpanded}
                                  onToggleResults={() =>
                                    setExpandedResults((prev) => ({
                                      ...prev,
                                      [s.id]: !prev[s.id],
                                    }))
                                  }
                                  onUndoCheckIn={() => undoCheckIn(s.id)}
                                  onRemove={() => removeSignup(s.id)}
                                />
                                {isExpanded && (
                                  <UserResultsPanel
                                    userId={s.user_id}
                                    name={name}
                                    workouts={workouts}
                                    workoutsLoading={workoutsLoading}
                                    statsByWorkout={statsByWorkout}
                                    canManage={canManage}
                                    onSaved={upsertStatInCache}
                                    onCleared={removeStatFromCache}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </SignupSection>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Workouts for this class on this day */}
            {tab === "workouts" && programId && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">Workouts</h4>
                  {canManage && !showWorkoutForm && (
                    <button
                      onClick={() => setShowWorkoutForm(true)}
                      className="h-8 px-3 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90"
                    >
                      Add workout
                    </button>
                  )}
                </div>

                {workoutsLoading ? (
                  <p className="text-sm text-[var(--color-ink-muted)]">Loading...</p>
                ) : workouts.length === 0 && !showWorkoutForm ? (
                  <p className="text-sm text-[var(--color-ink-muted)]">No workouts for this class today.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-[var(--color-rule)]">
                    {workouts.map((w) => {
                      const scopedToAll = (w.class_ids || []).length === 0;
                      const isEditing = editingWorkoutId === w.id;
                      if (isEditing) {
                        return (
                          <WorkoutEditRow
                            key={w.id}
                            workout={w}
                            onCancel={() => setEditingWorkoutId(null)}
                            onSave={async (update) => {
                              await handleEditWorkout(w, update);
                              setEditingWorkoutId(null);
                            }}
                          />
                        );
                      }
                      return (
                        <div key={w.id} className="py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                    w.format === "time"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {w.format}
                                </span>
                                <span className="text-sm font-medium truncate">{w.title}</span>
                                {scopedToAll && (
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] text-[10px] font-medium"
                                    title="Shared with all classes in this program"
                                  >
                                    Shared
                                  </span>
                                )}
                              </div>
                              {w.description && (
                                <div className="text-xs text-[var(--color-ink-soft)] mt-0.5 whitespace-pre-wrap">
                                  {w.description}
                                </div>
                              )}
                            </div>
                            {canManage && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {scopedToAll && (
                                  <button
                                    onClick={() => handleOverrideForThisClass(w)}
                                    className="h-7 px-2 rounded text-xs text-blue-700 hover:bg-blue-50"
                                    title="Make this workout specific to this class"
                                  >
                                    Override
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditingWorkoutId(w.id)}
                                  className="h-7 px-2 rounded text-xs text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteWorkout(w.id)}
                                  className="h-7 px-2 rounded text-xs text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {showWorkoutForm && (
                  <div className="mt-3 p-3 rounded-md bg-[var(--color-bg-sunken)] flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="flex flex-col flex-1 gap-1">
                        <label className="text-xs font-medium">Title</label>
                        <input
                          className="h-9 rounded border border-[var(--color-rule-strong)] bg-white px-3 text-sm"
                          placeholder="e.g. Back Squat 5x5"
                          value={workoutForm.title}
                          onChange={(e) =>
                            setWorkoutForm({ ...workoutForm, title: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex flex-col w-24 gap-1">
                        <label className="text-xs font-medium">Format</label>
                        <select
                          value={workoutForm.format}
                          onChange={(e) =>
                            setWorkoutForm({
                              ...workoutForm,
                              format: e.target.value as "time" | "amrap",
                            })
                          }
                          className="h-9 rounded border border-[var(--color-rule-strong)] bg-white px-2 text-sm"
                        >
                          <option value="time">Time</option>
                          <option value="amrap">AMRAP</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium">Description (optional)</label>
                      <textarea
                        className="rounded border border-[var(--color-rule-strong)] bg-white px-3 py-2 text-sm"
                        value={workoutForm.description}
                        onChange={(e) =>
                          setWorkoutForm({ ...workoutForm, description: e.target.value })
                        }
                        rows={2}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workoutForm.applyToAll}
                        onChange={(e) =>
                          setWorkoutForm({ ...workoutForm, applyToAll: e.target.checked })
                        }
                      />
                      Also apply to all other classes in this program
                    </label>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowWorkoutForm(false);
                          setWorkoutForm({
                            title: "",
                            description: "",
                            format: "time",
                            applyToAll: false,
                          });
                        }}
                        className="h-8 px-3 rounded text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddWorkout}
                        disabled={savingWorkout || !workoutForm.title.trim()}
                        className="h-8 px-3 rounded bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                      >
                        {savingWorkout ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings (admin/coach) — overrides apply to this occurrence only */}
            {tab === "settings" && canManage && (
              <SettingsPanel
                cls={cls}
                date={date}
                dateLabel={dateLabel}
                occurrence={occurrence}
                busy={busy}
                isCancelled={isCancelled}
                occurrenceCoachId={occurrenceCoachId}
                defaultCoachId={defaultCoachId}
                coachCandidates={coachCandidates}
                onUpdate={updateOccurrence}
                onDelete={handleDeleteOccurrence}
                onRestore={handleRestoreOccurrence}
              />
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- Workout inline edit row -------------------- */

function WorkoutEditRow({
  workout,
  onCancel,
  onSave,
}: {
  workout: any;
  onCancel: () => void;
  onSave: (update: {
    title: string;
    description: string | null;
    format: "time" | "amrap";
    applyToAll: boolean;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState<string>(workout.title || "");
  const [description, setDescription] = useState<string>(workout.description || "");
  const [format, setFormat] = useState<"time" | "amrap">(
    (workout.format as "time" | "amrap") || "time",
  );
  const [applyToAll, setApplyToAll] = useState<boolean>(
    (workout.class_ids || []).length === 0,
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        format,
        applyToAll,
      });
    } catch {
      // parent surfaces the error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-blue-300 bg-blue-50 px-3 py-3 flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex flex-col flex-1 gap-1">
          <label className="text-xs font-medium">Title</label>
          <input
            className="h-9 rounded border border-[var(--color-rule-strong)] bg-white px-3 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col w-24 gap-1">
          <label className="text-xs font-medium">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as "time" | "amrap")}
            className="h-9 rounded border border-[var(--color-rule-strong)] bg-white px-2 text-sm"
          >
            <option value="time">Time</option>
            <option value="amrap">AMRAP</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Description (optional)</label>
        <textarea
          className="rounded border border-[var(--color-rule-strong)] bg-white px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={applyToAll}
          onChange={(e) => setApplyToAll(e.target.checked)}
        />
        Apply to all classes in this program
      </label>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="h-8 px-3 rounded text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="h-8 px-3 rounded bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

/* -------------------- Settings panel (per-occurrence) -------------------- */

function SettingsPanel({
  cls,
  date,
  dateLabel,
  occurrence,
  busy,
  isCancelled,
  occurrenceCoachId,
  defaultCoachId,
  coachCandidates,
  onUpdate,
  onDelete,
  onRestore,
}: {
  cls: any;
  date: string;
  dateLabel: string;
  occurrence: any;
  busy: boolean;
  isCancelled: boolean;
  occurrenceCoachId: string | null;
  defaultCoachId: string | null;
  coachCandidates: any[];
  onUpdate: (u: { coach_id?: string | null; is_cancelled?: boolean; start_time?: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
  onRestore: () => Promise<void>;
}) {
  const occurrenceStartUtc: string | null = occurrence?.start_time ?? null;
  const defaultStartUtc: string | null = cls.start_time ?? null;
  const initialLocal = occurrenceStartUtc
    ? utcHHMMSSToLocalHHMM(occurrenceStartUtc, date)
    : "";
  const [timeLocal, setTimeLocal] = useState(initialLocal);
  const [savingTime, setSavingTime] = useState(false);

  useEffect(() => {
    setTimeLocal(
      occurrenceStartUtc ? utcHHMMSSToLocalHHMM(occurrenceStartUtc, date) : "",
    );
  }, [occurrenceStartUtc, date]);

  const currentUtc = timeLocal ? localHHMMToUtcHHMMSS(timeLocal, date) : null;
  const timeDirty = (currentUtc || null) !== (occurrenceStartUtc || null);
  const timeOverridden =
    (occurrenceStartUtc || null) !== (defaultStartUtc || null);

  async function saveTime() {
    setSavingTime(true);
    try {
      await onUpdate({ start_time: currentUtc });
    } finally {
      setSavingTime(false);
    }
  }

  async function resetTime() {
    setSavingTime(true);
    try {
      await onUpdate({ start_time: defaultStartUtc });
    } finally {
      setSavingTime(false);
    }
  }

  return (
    <div>
      <h4 className="text-sm font-semibold mb-1">This class on {dateLabel}</h4>
      <p className="text-xs text-[var(--color-ink-muted)] mb-4">
        Overrides apply only to this day. The recurring class itself is unaffected.
      </p>

      <div className="flex flex-col gap-4">
        {/* Start time override */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-[var(--color-ink-soft)] w-20 flex-shrink-0">Start</label>
          <input
            type="time"
            value={timeLocal}
            onChange={(e) => setTimeLocal(e.target.value)}
            disabled={busy || savingTime || !occurrence}
            className="h-9 rounded-md border border-[var(--color-rule-strong)] bg-white px-2 text-sm"
          />
          {timeLocal && (
            <button
              type="button"
              onClick={() => setTimeLocal("")}
              disabled={busy || savingTime}
              className="h-8 px-2 rounded text-xs text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Clear
            </button>
          )}
          {timeDirty && (
            <button
              type="button"
              onClick={saveTime}
              disabled={busy || savingTime}
              className="h-9 px-3 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              {savingTime ? "Saving..." : "Save time"}
            </button>
          )}
          {!timeDirty && timeOverridden && (
            <button
              type="button"
              onClick={resetTime}
              disabled={busy || savingTime}
              className="h-8 px-2 rounded text-xs text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Reset to default
            </button>
          )}
        </div>

        {/* Coach override */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-[var(--color-ink-soft)] w-20 flex-shrink-0">Coach</label>
          <select
            value={occurrenceCoachId ?? ""}
            onChange={(e) =>
              onUpdate({
                coach_id: e.target.value === "" ? null : e.target.value,
              })
            }
            disabled={busy || !occurrence}
            className="h-9 rounded-md border border-[var(--color-rule-strong)] bg-white px-2 text-sm"
          >
            <option value="">
              {defaultCoachId ? "— no coach —" : "— unassigned —"}
            </option>
            {coachCandidates.map((m: any) => {
              const name = `${m.profile?.first_name || ""} ${
                m.profile?.last_name || ""
              }`.trim() || "Coach";
              return (
                <option key={m.user_id} value={m.user_id}>
                  {name}
                </option>
              );
            })}
          </select>
          {defaultCoachId && occurrenceCoachId !== defaultCoachId && (
            <button
              type="button"
              onClick={() => onUpdate({ coach_id: defaultCoachId })}
              disabled={busy}
              className="h-8 px-2 rounded text-xs text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Reset to default
            </button>
          )}
        </div>

        {/* Delete / restore this occurrence */}
        <div className="flex items-center gap-2 flex-wrap border-t border-[var(--color-rule)] pt-4">
          <label className="text-xs text-[var(--color-ink-soft)] w-20 flex-shrink-0">Status</label>
          {isCancelled ? (
            <button
              type="button"
              onClick={onRestore}
              disabled={busy}
              className="h-9 px-3 rounded-md border border-[var(--color-rule-strong)] bg-white text-sm font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-sunken)] disabled:opacity-60"
            >
              Restore this class
            </button>
          ) : (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="h-9 px-3 rounded-md border border-red-300 bg-white text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              Delete this class
            </button>
          )}
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            Only affects {dateLabel}. The recurring class keeps running on other days.
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Workout results (per-user) -------------------- */

function formatSeconds(total: number | null | undefined): { min: string; sec: string } {
  if (total == null) return { min: "", sec: "" };
  const m = Math.floor(total / 60);
  const s = total % 60;
  return { min: String(m), sec: String(s).padStart(2, "0") };
}

function UserResultsPanel({
  userId,
  name,
  workouts,
  workoutsLoading,
  statsByWorkout,
  canManage,
  onSaved,
  onCleared,
}: {
  userId: string;
  name: string;
  workouts: any[];
  workoutsLoading: boolean;
  statsByWorkout: Record<string, Record<string, any>>;
  canManage: boolean;
  onSaved: (workoutId: string, stat: any) => void;
  onCleared: (workoutId: string, userId: string) => void;
}) {
  return (
    <div className="px-3 pb-3 pt-1 border-t border-[var(--color-rule)] bg-[var(--color-bg-sunken)] rounded-b-md">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] mb-2">
        Results
      </div>
      {workoutsLoading ? (
        <p className="text-xs text-[var(--color-ink-muted)]">Loading workouts...</p>
      ) : workouts.length === 0 ? (
        <p className="text-xs text-[var(--color-ink-muted)]">
          No workouts for this class today. Add a workout above to record results.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {workouts.map((w) => {
            const stat = statsByWorkout[w.id]?.[userId];
            return (
              <ResultRow
                key={w.id}
                workoutId={w.id}
                workoutTitle={w.title}
                format={w.format}
                userId={userId}
                name={name}
                stat={stat}
                canManage={canManage}
                onSaved={(s) => onSaved(w.id, s)}
                onCleared={() => onCleared(w.id, userId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultRow({
  workoutId,
  workoutTitle,
  format,
  userId,
  name,
  stat,
  canManage,
  onSaved,
  onCleared,
}: {
  workoutId: string;
  workoutTitle: string;
  format: "time" | "amrap";
  userId: string;
  name: string;
  stat: any | undefined;
  canManage: boolean;
  onSaved: (stat: any) => void;
  onCleared: () => void;
}) {
  const initialTime = formatSeconds(stat?.time_seconds);
  const [min, setMin] = useState(initialTime.min);
  const [sec, setSec] = useState(initialTime.sec);
  const [rounds, setRounds] = useState(
    stat?.amrap_rounds != null ? String(stat.amrap_rounds) : "",
  );
  const [reps, setReps] = useState(stat?.amrap_reps != null ? String(stat.amrap_reps) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (format === "time") {
      const t = formatSeconds(stat?.time_seconds);
      setMin(t.min);
      setSec(t.sec);
    } else {
      setRounds(stat?.amrap_rounds != null ? String(stat.amrap_rounds) : "");
      setReps(stat?.amrap_reps != null ? String(stat.amrap_reps) : "");
    }
  }, [stat, format]);

  async function handleSave() {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, any> = { user_id: userId };
      if (format === "time") {
        const m = parseInt(min || "0", 10) || 0;
        const s = parseInt(sec || "0", 10) || 0;
        body.time_seconds = m * 60 + s;
        body.amrap_rounds = null;
        body.amrap_reps = null;
      } else {
        body.amrap_rounds = rounds === "" ? null : parseInt(rounds, 10) || 0;
        body.amrap_reps = reps === "" ? null : parseInt(reps, 10) || 0;
        body.time_seconds = null;
      }
      const saved = await apiFetch(`/workouts/${workoutId}/stats`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      onSaved(saved);
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!canManage) return;
    if (!stat) {
      if (format === "time") {
        setMin("");
        setSec("");
      } else {
        setRounds("");
        setReps("");
      }
      return;
    }
    if (!confirm(`Clear ${workoutTitle} result for ${name}?`)) return;
    setSaving(true);
    try {
      await apiFetch(`/workout-stats/${stat.id}`, { method: "DELETE" });
      onCleared();
      if (format === "time") {
        setMin("");
        setSec("");
      } else {
        setRounds("");
        setReps("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const hasValue =
    format === "time"
      ? min !== "" || sec !== ""
      : rounds !== "" || reps !== "";

  return (
    <div className="flex items-center gap-2 rounded border border-[var(--color-rule)] px-2 py-1.5 bg-white">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-1 py-0.5 rounded text-[9px] font-semibold uppercase ${
              format === "time"
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {format}
          </span>
          <span className="text-xs font-medium truncate">{workoutTitle}</span>
        </div>
      </div>
      {format === "time" ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="m"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            disabled={!canManage}
            className="w-12 h-7 rounded border border-[var(--color-rule-strong)] px-1.5 text-xs text-right"
          />
          <span className="text-xs text-[var(--color-ink-muted)]">:</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            placeholder="ss"
            value={sec}
            onChange={(e) => setSec(e.target.value)}
            disabled={!canManage}
            className="w-12 h-7 rounded border border-[var(--color-rule-strong)] px-1.5 text-xs text-right"
          />
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="rnds"
            value={rounds}
            onChange={(e) => setRounds(e.target.value)}
            disabled={!canManage}
            className="w-14 h-7 rounded border border-[var(--color-rule-strong)] px-1.5 text-xs text-right"
          />
          <span className="text-xs text-[var(--color-ink-muted)]">+</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="reps"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            disabled={!canManage}
            className="w-14 h-7 rounded border border-[var(--color-rule-strong)] px-1.5 text-xs text-right"
          />
        </div>
      )}
      {canManage && (
        <>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-7 px-2 rounded bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "…" : "Save"}
          </button>
          {(stat || hasValue) && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="h-7 px-2 rounded text-xs text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)] disabled:opacity-60"
              title="Clear result"
            >
              ✕
            </button>
          )}
        </>
      )}
      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </div>
  );
}

function Avatar({ profile, size = 32 }: { profile: any; size?: number }) {
  const style = { width: size, height: size };
  return (
    <span
      style={style}
      className="rounded-full bg-[var(--color-rule)] flex items-center justify-center overflow-hidden flex-shrink-0"
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          className="font-bold text-[var(--color-ink-soft)]"
          style={{ fontSize: Math.max(10, size * 0.35) }}
        >
          {(profile?.first_name?.[0] || "").toUpperCase()}
          {(profile?.last_name?.[0] || "").toUpperCase()}
        </span>
      )}
    </span>
  );
}

function SignupSection({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent: "gray" | "green";
  children: ReactNode;
}) {
  const pillClass =
    accent === "green"
      ? "bg-green-100 text-green-700"
      : "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)]";
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          {title}
        </h4>
        <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${pillClass}`}>
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function SignupRow({
  signup,
  isSelf,
  canManage,
  busy,
  isResultsExpanded,
  onCheckIn,
  onUndoCheckIn,
  onToggleResults,
  onRemove,
}: {
  signup: any;
  isSelf: boolean;
  canManage: boolean;
  busy: boolean;
  isResultsExpanded?: boolean;
  onCheckIn?: () => void;
  onUndoCheckIn?: () => void;
  onToggleResults?: () => void;
  onRemove?: () => void;
}) {
  const name =
    `${signup.profile?.first_name || ""} ${signup.profile?.last_name || ""}`.trim() ||
    "Member";
  const checkedInAt = signup.checked_in_at
    ? new Date(signup.checked_in_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  return (
    <div
      className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
        signup.checked_in
          ? "border-green-200 bg-green-50/40"
          : "border-[var(--color-rule)] bg-white"
      }`}
    >
      <Avatar profile={signup.profile} size={36} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate flex items-center gap-1.5">
          <span className="truncate">{name}</span>
          {isSelf && (
            <span className="text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)] bg-[var(--color-bg-soft)] rounded px-1.5 py-0.5">
              You
            </span>
          )}
        </div>
        {signup.checked_in ? (
          <div className="text-xs text-green-700 flex items-center gap-1">
            <span>✓</span>
            <span>Checked in{checkedInAt ? ` · ${checkedInAt}` : ""}</span>
          </div>
        ) : (
          <div className="text-xs text-[var(--color-ink-muted)]">Not yet checked in</div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {canManage && !signup.checked_in && onCheckIn && (
          <button
            onClick={onCheckIn}
            disabled={busy}
            className="h-8 px-3 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            Check in
          </button>
        )}
        {canManage && signup.checked_in && onToggleResults && (
          <button
            onClick={onToggleResults}
            className="h-8 px-2 rounded-md border border-[var(--color-rule-strong)] text-xs font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            title={isResultsExpanded ? "Hide results" : "Show results"}
          >
            {isResultsExpanded ? "Hide" : "Results"}
          </button>
        )}
        {canManage && signup.checked_in && onUndoCheckIn && (
          <button
            onClick={onUndoCheckIn}
            disabled={busy}
            className="h-8 w-8 rounded-md text-[var(--color-ink-muted)] hover:bg-[var(--color-bg-soft)] disabled:opacity-60 flex items-center justify-center"
            title="Undo check-in"
            aria-label="Undo check-in"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
            </svg>
          </button>
        )}
        {canManage && onRemove && (
          <button
            onClick={onRemove}
            disabled={busy}
            className="h-8 w-8 rounded-md text-[var(--color-ink-muted)] hover:text-red-600 hover:bg-red-50 disabled:opacity-60 flex items-center justify-center"
            title="Remove signup"
            aria-label="Remove signup"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
