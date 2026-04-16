"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  Mail,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Target,
  Trophy,
  User,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import {
  StatusToggle,
  MemberProgramEnrollments,
} from "@/components/MemberDetails";

type WorkoutStatRow = {
  id: string;
  workout_id: string;
  user_id: string;
  time_seconds: number | null;
  amrap_rounds: number | null;
  amrap_reps: number | null;
  notes: string | null;
  updated_at: string;
  overall_rank: number | null;
  overall_total: number;
  gender_rank: number | null;
  gender_total: number;
  user_gender: string | null;
  workout: {
    id: string;
    title: string;
    description: string | null;
    format: "time" | "amrap" | string;
    date: string;
    program: { id: string; name: string; gym_id: string } | null;
  } | null;
};

type MemberTab = "overview" | "access" | "memberships" | "history";

export default function MemberDetailPage() {
  const params = useParams();
  const gymId = params?.gymId as string;
  const userId = params?.userId as string;

  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<MemberTab>("overview");

  const [history, setHistory] = useState<WorkoutStatRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);

  async function load() {
    if (!gymId || !userId) return;
    try {
      const data = await apiFetch(`/gyms/${gymId}/members`);
      const found = (data || []).find((m: any) => m.user_id === userId);
      if (!found) setNotFound(true);
      else setMember(found);
    } catch (err) {
      console.error(err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    if (!gymId || !userId) return;
    setHistoryLoading(true);
    try {
      const data = await apiFetch(
        `/gyms/${gymId}/members/${userId}/workout-stats`,
      );
      setHistory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId, userId]);

  async function handleToggleRole(role: string, hasRole: boolean) {
    try {
      if (hasRole) {
        await apiFetch(`/gyms/${gymId}/members/${userId}/roles/${role}`, {
          method: "DELETE",
        });
      } else {
        await apiFetch(`/gyms/${gymId}/members/${userId}/roles`, {
          method: "POST",
          body: JSON.stringify({ role }),
        });
      }
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to update role");
    }
  }

  async function handleUpdateStatus(status: string) {
    if (!member) return;
    try {
      await apiFetch(`/gyms/${gymId}/members/${member.id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to update status");
    }
  }

  if (loading) {
    return (
      <div className="text-[13px] text-[var(--color-ink-muted)]">Loading…</div>
    );
  }
  if (notFound || !member) {
    return (
      <div>
        <BackButton href={`/gym/${gymId}?tab=members`} label="Members" className="mb-4" />
        <p className="text-[13px] text-[var(--color-ink-soft)]">
          Member not found.
        </p>
      </div>
    );
  }

  const allRoles: { key: string; label: string }[] = [
    { key: "member", label: "Member" },
    { key: "coach", label: "Coach" },
    { key: "admin", label: "Admin" },
  ];
  const memberRoles: string[] = member.roles || [];
  const fullName = `${member.profile?.first_name || ""} ${
    member.profile?.last_name || ""
  }`.trim();
  const initials = `${member.profile?.first_name?.[0] || ""}${
    member.profile?.last_name?.[0] || ""
  }`.toUpperCase();
  const isActive = member.status === "active";
  const genderLabel = formatGender(member.profile?.gender);

  return (
    <div>
      <div className="mb-4">
        <BackButton href={`/gym/${gymId}?tab=members`} label="Members" />
      </div>

      {editOpen ? (
        <EditMemberInlineForm
          gymId={gymId}
          userId={userId}
          initial={{
            first_name: member.profile?.first_name || "",
            last_name: member.profile?.last_name || "",
            gender: member.profile?.gender || null,
            email: member.profile?.email || "",
            phone: member.profile?.phone || "",
          }}
          onCancel={() => setEditOpen(false)}
          onSaved={async () => {
            setEditOpen(false);
            await load();
          }}
        />
      ) : (
        <section className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight">
                {fullName || "Unnamed member"}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-medium border ${
                  isActive
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-accent-rule)]"
                    : "bg-[var(--color-bg-soft)] text-[var(--color-ink-muted)] border-[var(--color-rule)]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive
                      ? "bg-[var(--color-accent)]"
                      : "bg-[var(--color-ink-faint)]"
                  }`}
                />
                {isActive ? "Active" : "Inactive"}
              </span>
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-[var(--color-rule)] text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors"
              >
                <Pencil size={12} strokeWidth={1.75} />
                Edit
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-[var(--color-ink-soft)]">
              <span className="inline-flex items-center gap-1.5">
                <Mail size={12} strokeWidth={1.8} className="text-[var(--color-ink-muted)]" />
                {member.profile?.email || member.email || "—"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone size={12} strokeWidth={1.8} className="text-[var(--color-ink-muted)]" />
                {member.profile?.phone || member.phone || "—"}
              </span>
              {genderLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <User size={12} strokeWidth={1.8} className="text-[var(--color-ink-muted)]" />
                  {genderLabel}
                </span>
              )}
            </div>
            {member.created_at && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-muted)] tabular-nums">
                <CalendarDays size={12} strokeWidth={1.75} />
                Joined{" "}
                {new Date(member.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        className="border-b border-[var(--color-rule)] flex gap-1 mb-6"
      >
        {(
          [
            { key: "overview", label: "Overview", icon: LayoutDashboard },
            { key: "access", label: "Access", icon: ShieldCheck },
            {
              key: "memberships",
              label: "Memberships",
              icon: CreditCard,
              count: (member.subscriptions || []).filter(
                (s: any) => s.status === "active",
              ).length,
            },
            {
              key: "history",
              label: "Workout history",
              icon: Dumbbell,
              count: history.length,
            },
          ] as {
            key: MemberTab;
            label: string;
            icon: typeof Dumbbell;
            count?: number;
          }[]
        ).map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`relative inline-flex items-center gap-2 h-10 px-3 text-[13px] -mb-px transition-colors ${
                active
                  ? "text-[var(--color-ink)] font-medium"
                  : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              }`}
            >
              <Icon
                size={14}
                strokeWidth={active ? 2 : 1.75}
                className={
                  active
                    ? "text-[var(--color-ink)]"
                    : "text-[var(--color-ink-muted)]"
                }
              />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span
                  className={`inline-flex items-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10.5px] font-medium tabular-nums border ${
                    active
                      ? "bg-[var(--color-ink)] text-white border-[var(--color-ink)]"
                      : "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] border-[var(--color-rule)]"
                  }`}
                >
                  {t.count}
                </span>
              )}
              {active && (
                <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-[var(--color-accent)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      {tab === "overview" && (
        <div className="flex flex-col gap-4">
          <MemberNotesCard
            gymId={gymId}
            memberId={member.id}
            initialNotes={member.notes ?? null}
            onSaved={load}
          />
          <section className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-5">
            <MemberProgramEnrollments
              gymId={gymId}
              userId={member.user_id}
              onChanged={load}
            />
          </section>
        </div>
      )}

      {tab === "access" && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminCard
            eyebrow="Access"
            title="Roles"
            hint="Toggle to grant or revoke."
          >
            <div className="flex flex-wrap gap-2">
              {allRoles.map((r) => {
                const hasRole = memberRoles.includes(r.key);
                return (
                  <button
                    key={r.key}
                    onClick={() => handleToggleRole(r.key, hasRole)}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border transition-colors ${
                      hasRole
                        ? "bg-[var(--color-bg-soft)] text-[var(--color-ink)] border-[var(--color-rule-strong)]"
                        : "bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] border-[var(--color-rule)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-strong)]"
                    }`}
                  >
                    {hasRole && <Check size={12} strokeWidth={2.5} />}
                    {r.label}
                  </button>
                );
              })}
            </div>
          </AdminCard>
          <AdminCard
            eyebrow="Membership"
            title="Status"
            hint="Deactivate to pause this member's access."
          >
            <StatusToggle
              active={isActive}
              onChange={(next) =>
                handleUpdateStatus(next ? "active" : "inactive")
              }
            />
          </AdminCard>
        </section>
      )}

      {tab === "memberships" && (
        <MembershipsTab
          gymId={gymId}
          userId={userId}
          subscriptions={member.subscriptions || []}
          onChanged={load}
        />
      )}

      {tab === "history" && (
        <WorkoutHistory history={history} loading={historyLoading} gymId={gymId} userId={userId} />
      )}
    </div>
  );
}

function AdminCard({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-5">
      <p className="text-[10.5px] font-medium tracking-[0.14em] uppercase text-[var(--color-ink-muted)] mb-1">
        {eyebrow}
      </p>
      <h3 className="text-[14px] font-semibold text-[var(--color-ink)] mb-0.5">
        {title}
      </h3>
      <p className="text-[12px] text-[var(--color-ink-muted)] mb-4">{hint}</p>
      {children}
    </div>
  );
}

/* -------------------- Member notes -------------------- */

function MemberNotesCard({
  gymId,
  memberId,
  initialNotes,
  onSaved,
}: {
  gymId: string;
  memberId: string;
  initialNotes: string | null;
  onSaved: () => void | Promise<void>;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setNotes(initialNotes ?? "");
  }, [initialNotes]);

  const dirty = (initialNotes ?? "") !== notes;

  async function handleSave() {
    if (saving || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/gyms/${gymId}/members/${memberId}`, {
        method: "PUT",
        body: JSON.stringify({ notes: notes.trim() ? notes : null }),
      });
      setSavedAt(Date.now());
      await onSaved();
    } catch (err: any) {
      setError(err?.message || "Failed to save notes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10.5px] font-medium tracking-[0.14em] uppercase text-[var(--color-accent)] mb-1">
            Admin notes
          </p>
          <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">
            Internal notes
          </h3>
          <p className="text-[12px] text-[var(--color-ink-muted)] mt-0.5">
            Visible to gym admins only. Not shown to the member.
          </p>
        </div>
        {savedAt && !dirty && !error && (
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            Saved
          </span>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add context, preferences, injury history, or follow-ups…"
        rows={4}
        className="w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
      />
      {error && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 mt-3">
        {dirty && (
          <button
            type="button"
            onClick={() => setNotes(initialNotes ?? "")}
            className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
          >
            Revert
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : "Save notes"}
        </button>
      </div>
    </section>
  );
}

/* -------------------- Workout history -------------------- */

function WorkoutHistory({
  history,
  loading,
  gymId,
  userId,
}: {
  history: WorkoutStatRow[];
  loading: boolean;
  gymId: string;
  userId: string;
}) {
  const totals = useMemo(() => {
    const byProgram = new Map<
      string,
      {
        id: string;
        name: string;
        rows: WorkoutStatRow[];
      }
    >();
    let timeWorkouts = 0;
    let amrapWorkouts = 0;
    for (const row of history) {
      const programId = row.workout?.program?.id ?? "__none__";
      const programName = row.workout?.program?.name ?? "Unassigned";
      const entry = byProgram.get(programId) || {
        id: programId,
        name: programName,
        rows: [],
      };
      entry.rows.push(row);
      byProgram.set(programId, entry);
      if (row.workout?.format === "time") timeWorkouts++;
      if (row.workout?.format === "amrap") amrapWorkouts++;
    }
    const programs = Array.from(byProgram.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return {
      total: history.length,
      timeWorkouts,
      amrapWorkouts,
      programs,
    };
  }, [history]);

  return (
    <section className="space-y-4">
      <p className="text-[13px] text-[var(--color-ink-soft)]">
        Completed workouts grouped by program, newest first.
      </p>

      {/* Totals */}
      <div className="grid grid-cols-3 border border-[var(--color-rule)] rounded-xl overflow-hidden bg-[var(--color-bg-card)]">
        <TotalCell
          icon={Trophy}
          label="Total completed"
          value={loading ? "—" : totals.total}
          accent
        />
        <TotalCell
          icon={Clock}
          label="For time"
          value={loading ? "—" : totals.timeWorkouts}
          divider
        />
        <TotalCell
          icon={Target}
          label="AMRAP"
          value={loading ? "—" : totals.amrapWorkouts}
        />
      </div>

      {/* Programs */}
      {loading ? (
        <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-10 text-center text-[13px] text-[var(--color-ink-muted)]">
          Loading history…
        </div>
      ) : totals.total === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-rule-strong)] bg-[var(--color-bg-sunken)] p-12 text-center">
          <div className="mx-auto h-10 w-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-rule)] flex items-center justify-center mb-3">
            <Dumbbell
              size={18}
              strokeWidth={1.6}
              className="text-[var(--color-ink-muted)]"
            />
          </div>
          <p className="text-[14px] font-medium text-[var(--color-ink)] mb-1">
            No workouts logged yet
          </p>
          <p className="text-[12.5px] text-[var(--color-ink-muted)] max-w-xs mx-auto">
            Results will appear here once this member completes logged workouts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {totals.programs.map((p) => (
            <ProgramHistoryCard key={p.id} program={p} gymId={gymId} userId={userId} />
          ))}
        </div>
      )}
    </section>
  );
}

function TotalCell({
  icon: Icon,
  label,
  value,
  accent,
  divider,
}: {
  icon: typeof Trophy;
  label: string;
  value: number | string;
  accent?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      className={`p-5 ${divider ? "border-x border-[var(--color-rule)]" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase text-[var(--color-ink-muted)]">
        <Icon size={12} strokeWidth={1.8} />
        <span>{label}</span>
      </div>
      <div
        className={`mt-2 font-display text-[28px] font-semibold tabular-nums ${
          accent ? "text-[var(--color-accent-ink)]" : "text-[var(--color-ink)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

const HISTORY_PAGE_SIZE = 5;

function ProgramHistoryCard({
  program,
  gymId,
  userId,
}: {
  program: { id: string; name: string; rows: WorkoutStatRow[] };
  gymId: string;
  userId: string;
}) {
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState(0);
  const rows = useMemo(
    () =>
      [...program.rows].sort((a, b) => {
        const ad = a.workout?.date || "";
        const bd = b.workout?.date || "";
        return bd.localeCompare(ad);
      }),
    [program.rows],
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / HISTORY_PAGE_SIZE));
  // Clamp page if data shrinks beneath current page.
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * HISTORY_PAGE_SIZE;
  const pageRows = rows.slice(start, start + HISTORY_PAGE_SIZE);

  return (
    <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--color-bg-sunken)] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          <div className="text-left min-w-0">
            <h3 className="text-[14.5px] font-semibold text-[var(--color-ink)] truncate">
              {program.name}
            </h3>
            <p className="text-[11.5px] text-[var(--color-ink-muted)]">
              {rows.length} workout{rows.length === 1 ? "" : "s"} completed
            </p>
          </div>
        </div>
        <ChevronDown
          size={15}
          strokeWidth={1.8}
          className={`text-[var(--color-ink-muted)] transition-transform ${
            open ? "" : "-rotate-90"
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-[var(--color-rule)]">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--color-bg-sunken)] border-b border-[var(--color-rule)]">
                <th className="text-left px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Workout
                </th>
                <th className="text-left px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Format
                </th>
                <th className="text-left px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Result
                </th>
                <th className="text-left px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Rank
                </th>
                <th className="text-left px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <HistoryRow key={r.id} row={r} gymId={gymId} userId={userId} />
              ))}
            </tbody>
          </table>
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
              <span className="text-[11.5px] text-[var(--color-ink-muted)] tabular-nums">
                Showing {start + 1}–{Math.min(start + HISTORY_PAGE_SIZE, rows.length)} of {rows.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="h-7 px-2.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[12px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <span className="px-2 text-[11.5px] tabular-nums text-[var(--color-ink-muted)]">
                  Page {safePage + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="h-7 px-2.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[12px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryRow({
  row,
  gymId,
  userId,
}: {
  row: WorkoutStatRow;
  gymId: string;
  userId: string;
}) {
  const router = useRouter();
  const w = row.workout;
  const dateStr = w?.date
    ? new Date(w.date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const canNav = !!w?.id;
  const onOpen = () => {
    if (canNav && w) {
      router.push(`/gym/${gymId}/workouts/${w.id}?userId=${userId}`);
    }
  };

  return (
    <tr
      onClick={onOpen}
      className={`border-b border-[var(--color-rule)] last:border-b-0 ${
        canNav
          ? "cursor-pointer hover:bg-[var(--color-bg-sunken)] transition-colors"
          : ""
      }`}
    >
      <td className="px-5 py-3 align-top">
        <div className="text-[12.5px] font-medium tabular-nums text-[var(--color-ink)]">
          {dateStr}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="text-[13px] font-medium text-[var(--color-ink)]">
          {w?.title || "Untitled workout"}
        </div>
        {w?.description && (
          <div className="text-[11.5px] text-[var(--color-ink-muted)] mt-0.5 line-clamp-2 max-w-md">
            {w.description}
          </div>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <FormatBadge format={w?.format || "other"} />
      </td>
      <td className="px-4 py-3 align-top">
        <ResultCell row={row} />
      </td>
      <td className="px-4 py-3 align-top">
        <RankCell row={row} />
      </td>
      <td className="px-5 py-3 align-top">
        <span className="text-[12px] text-[var(--color-ink-soft)]">
          {row.notes?.trim() || (
            <span className="text-[var(--color-ink-muted)]">—</span>
          )}
        </span>
      </td>
    </tr>
  );
}

function RankCell({ row }: { row: WorkoutStatRow }) {
  if (row.overall_rank == null || row.overall_total === 0) {
    return <span className="text-[12px] text-[var(--color-ink-muted)]">—</span>;
  }
  const genderLabel =
    row.user_gender === "male"
      ? "M"
      : row.user_gender === "female"
        ? "F"
        : null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold tabular-nums text-[var(--color-ink)]">
        <Trophy
          size={11}
          strokeWidth={2}
          className="text-[var(--color-accent-ink)]"
        />
        #{row.overall_rank}
        <span className="text-[11px] font-normal text-[var(--color-ink-muted)]">
          / {row.overall_total}
        </span>
      </span>
      {genderLabel && row.gender_rank != null && row.gender_total > 0 && (
        <span className="text-[10.5px] tabular-nums text-[var(--color-ink-muted)]">
          #{row.gender_rank} / {row.gender_total} {genderLabel}
        </span>
      )}
    </div>
  );
}

function FormatBadge({ format }: { format: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    time: {
      label: "For Time",
      cls: "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] border-[var(--color-rule)]",
    },
    amrap: {
      label: "AMRAP",
      cls: "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-accent-rule)]",
    },
  };
  const entry = map[format] || {
    label: format || "—",
    cls: "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] border-[var(--color-rule)]",
  };
  return (
    <span
      className={`inline-flex items-center h-5 px-2 rounded-full text-[10.5px] font-medium uppercase tracking-wide border ${entry.cls}`}
    >
      {entry.label}
    </span>
  );
}

function RxScaledBadge({ value }: { value?: string | null }) {
  if (!value) return null;
  return (
    <span
      className={`inline-flex items-center h-4 px-1.5 rounded text-[9.5px] font-semibold uppercase ${
        value === "rx"
          ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"
          : "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)]"
      }`}
    >
      {value === "rx" ? "Rx" : "Scaled"}
    </span>
  );
}

function ResultCell({ row }: { row: WorkoutStatRow }) {
  const format = row.workout?.format;
  const rxBadge = <RxScaledBadge value={(row as any).rx_scaled} />;
  if (format === "time" && row.time_seconds != null) {
    const m = Math.floor(row.time_seconds / 60);
    const s = row.time_seconds % 60;
    return (
      <div className="inline-flex items-center gap-1.5 tabular-nums">
        <span className="text-[14px] font-semibold text-[var(--color-ink)]">
          {m}:{String(s).padStart(2, "0")}
        </span>
        <span className="text-[10.5px] text-[var(--color-ink-muted)]">
          min
        </span>
        {rxBadge}
      </div>
    );
  }
  if (format === "amrap") {
    const rounds = row.amrap_rounds ?? 0;
    const reps = row.amrap_reps ?? 0;
    return (
      <div className="inline-flex items-center gap-1.5 tabular-nums">
        <span className="text-[14px] font-semibold text-[var(--color-ink)]">
          {rounds}
        </span>
        <span className="text-[10.5px] text-[var(--color-ink-muted)]">
          rd
        </span>
        {reps > 0 && (
          <>
            <span className="text-[var(--color-ink-faint)]">+</span>
            <span className="text-[14px] font-semibold text-[var(--color-ink)]">
              {reps}
            </span>
            <span className="text-[10.5px] text-[var(--color-ink-muted)]">
              reps
            </span>
          </>
        )}
        {rxBadge}
      </div>
    );
  }
  return <span className="text-[12px] text-[var(--color-ink-muted)]">—</span>;
}

/* -------------------- Memberships tab -------------------- */

type Subscription = {
  id: string;
  status: "active" | "paused" | "cancelled" | "expired";
  period_end: string | null;
  plan: {
    id: string;
    name: string;
    price_cents: number;
    type: "monthly" | "annual" | "count";
    class_count: number | null;
  } | null;
};

function MembershipsTab({
  gymId,
  userId,
  subscriptions,
  onChanged,
}: {
  gymId: string;
  userId: string;
  subscriptions: Subscription[];
  onChanged: () => void | Promise<void>;
}) {
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setPlansLoading(true);
      try {
        const data = await apiFetch(`/gyms/${gymId}/plans`);
        setPlans(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setPlansLoading(false);
      }
    })();
  }, [gymId]);

  const active = subscriptions.filter((s) => s.status === "active");
  const past = subscriptions.filter((s) => s.status !== "active");

  const billingLabel = (t?: string) =>
    t === "monthly" ? "/ month" : t === "annual" ? "/ year" : "one-time";

  async function handleAssign() {
    if (!selectedPlanId || saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/gyms/${gymId}/members/${userId}/subscriptions`, {
        method: "POST",
        body: JSON.stringify({ plan_id: selectedPlanId }),
      });
      setAssignOpen(false);
      setSelectedPlanId("");
      await onChanged();
    } catch (err: any) {
      setError(err?.message || "Failed to assign membership");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(subId: string) {
    if (!confirm("Cancel this membership?")) return;
    try {
      await apiFetch(
        `/gyms/${gymId}/members/${userId}/subscriptions/${subId}`,
        { method: "DELETE" },
      );
      await onChanged();
    } catch (err: any) {
      alert(err?.message || "Failed to cancel");
    }
  }

  function renderSubCard(sub: Subscription, isActive: boolean) {
    const priceCents = sub.plan?.price_cents ?? 0;
    return (
      <div
        key={sub.id}
        className="border border-[var(--color-rule)] rounded-xl p-5 bg-[var(--color-bg-card)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] font-medium capitalize">
              {sub.plan?.type === "count" ? "Class pack" : sub.plan?.type || "Plan"}
            </div>
            <h3 className="font-display text-lg font-semibold leading-tight tracking-tight mt-0.5">
              {sub.plan?.name || "Plan"}
            </h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-medium border ${
              isActive
                ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-accent-rule)]"
                : "bg-[var(--color-bg-soft)] text-[var(--color-ink-muted)] border-[var(--color-rule)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive
                  ? "bg-[var(--color-accent)]"
                  : "bg-[var(--color-ink-faint)]"
              }`}
            />
            {sub.status}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 mt-4">
          <span className="font-display text-3xl font-semibold tabular-nums tracking-tight">
            ${(priceCents / 100).toFixed(2)}
          </span>
          <span className="text-xs text-[var(--color-ink-muted)]">
            {billingLabel(sub.plan?.type)}
          </span>
          {sub.plan?.type === "count" && sub.plan?.class_count && (
            <span className="text-xs text-[var(--color-ink-soft)] ml-1">
              · {sub.plan.class_count} classes
            </span>
          )}
        </div>

        {sub.period_end && (
          <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-muted)]">
            <CalendarDays size={12} strokeWidth={1.75} />
            <span>
              {isActive ? "Renews" : "Ended"}{" "}
              {new Date(sub.period_end).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        {isActive && (
          <button
            onClick={() => handleCancel(sub.id)}
            className="mt-4 w-full h-8 px-3 rounded-md border border-[var(--color-rule)] text-xs font-medium text-[var(--color-ink-muted)] hover:text-red-600 hover:border-red-200 transition-colors"
          >
            Cancel membership
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-medium tracking-[0.14em] uppercase text-[var(--color-ink-muted)]">
            Billing
          </p>
          <h2 className="font-display text-xl font-semibold tracking-tight mt-0.5">
            Memberships
          </h2>
          <p className="text-[13px] text-[var(--color-ink-soft)] mt-0.5">
            Plans this member is subscribed to at your gym.
          </p>
        </div>
        {!assignOpen && (
          <button
            onClick={() => setAssignOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.25} />
            Assign membership
          </button>
        )}
      </div>

      {assignOpen && (
        <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent-rule)]" />
              <h3 className="font-display text-base font-semibold tracking-tight">
                Assign a plan
              </h3>
            </div>
            <button
              onClick={() => {
                setAssignOpen(false);
                setSelectedPlanId("");
                setError(null);
              }}
              aria-label="Close"
              className="h-7 w-7 rounded-md border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] flex items-center justify-center transition-colors"
            >
              <X size={13} strokeWidth={2} />
            </button>
          </div>
          {plansLoading ? (
            <p className="text-[13px] text-[var(--color-ink-soft)]">
              Loading plans…
            </p>
          ) : plans.length === 0 ? (
            <p className="text-[13px] text-[var(--color-ink-muted)]">
              No plans available. Create one in the Memberships panel first.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {plans.map((p) => {
                const selected = selectedPlanId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`text-left border rounded-lg p-3 transition-colors ${
                      selected
                        ? "border-[var(--color-ink)] bg-[var(--color-bg-soft)]"
                        : "border-[var(--color-rule)] hover:border-[var(--color-ink)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] font-medium capitalize">
                          {p.type === "count" ? "Class pack" : p.type}
                        </div>
                        <div className="text-[13.5px] font-semibold text-[var(--color-ink)] truncate">
                          {p.name}
                        </div>
                      </div>
                      {selected && (
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          className="text-[var(--color-accent)] shrink-0"
                        />
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 mt-1.5">
                      <span className="text-[15px] font-semibold tabular-nums">
                        ${(p.price_cents / 100).toFixed(2)}
                      </span>
                      <span className="text-[11px] text-[var(--color-ink-muted)]">
                        {billingLabel(p.type)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {error && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setAssignOpen(false);
                setSelectedPlanId("");
                setError(null);
              }}
              className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedPlanId || saving}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
            >
              {saving ? "Assigning…" : "Assign plan"}
            </button>
          </div>
        </div>
      )}

      {active.length === 0 && past.length === 0 ? (
        <div className="border border-[var(--color-rule)] rounded-xl p-12 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center mb-3">
            <CreditCard
              size={16}
              className="text-[var(--color-ink-muted)]"
              strokeWidth={1.75}
            />
          </div>
          <p className="text-[var(--color-ink-soft)] text-sm">
            No memberships assigned yet.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <p className="text-[10.5px] font-medium tracking-[0.14em] uppercase text-[var(--color-ink-muted)] mb-2">
                Active ({active.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {active.map((s) => renderSubCard(s, true))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-[10.5px] font-medium tracking-[0.14em] uppercase text-[var(--color-ink-muted)] mb-2">
                Past ({past.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {past.map((s) => renderSubCard(s, false))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* -------------------- Gender helpers -------------------- */

const GENDER_OPTIONS: {
  value: "male" | "female" | "other" | "prefer_not_to_say";
  label: string;
}[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

function formatGender(g: string | null | undefined): string {
  if (!g) return "";
  const match = GENDER_OPTIONS.find((o) => o.value === g);
  return match ? match.label : "";
}

/* -------------------- Edit member inline form -------------------- */

function EditMemberInlineForm({
  gymId,
  userId,
  initial,
  onCancel,
  onSaved,
}: {
  gymId: string;
  userId: string;
  initial: {
    first_name: string;
    last_name: string;
    gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
    email: string;
    phone: string;
  };
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [firstName, setFirstName] = useState(initial.first_name);
  const [lastName, setLastName] = useState(initial.last_name);
  const [gender, setGender] = useState<
    "male" | "female" | "other" | "prefer_not_to_say" | null
  >(initial.gender);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (saving) return;
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/gyms/${gymId}/members/${userId}/profile`, {
        method: "PUT",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          gender,
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      });
      await onSaved();
    } catch (err: any) {
      setError(err?.message || "Failed to save changes");
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--color-accent-rule)] bg-[var(--color-bg-card)] shadow-[var(--shadow-soft)] p-6 mb-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent-rule)]" />
        <h2 className="font-display text-base font-semibold tracking-tight">
          Edit member
        </h2>
      </div>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="em-first" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
              First name
            </label>
            <input
              id="em-first"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="em-last" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
              Last name
            </label>
            <input
              id="em-last"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="em-email" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
            Email
          </label>
          <input
            id="em-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="em-phone" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
              Phone
            </label>
            <input
              id="em-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 555 5555"
              className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
            />
          </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Gender</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setGender(null)}
              aria-pressed={gender === null}
              className={`h-8 px-3 rounded-full text-[13px] font-medium border transition-colors ${
                gender === null
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-accent-rule-strong)]"
                  : "bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] border-[var(--color-rule)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)]"
              }`}
            >
              Unset
            </button>
            {GENDER_OPTIONS.map((o) => {
              const active = gender === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setGender(o.value)}
                  aria-pressed={active}
                  className={`h-8 px-3 rounded-full text-[13px] font-medium border transition-colors ${
                    active
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-accent-rule-strong)]"
                      : "bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] border-[var(--color-rule)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)]"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </section>
  );
}
