"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  LayoutGrid,
  Pencil,
  Plus,
  Repeat,
  Target,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { ClassCalendar } from "@/components/ClassCalendar";
import { ClassOccurrenceModal } from "@/components/ClassOccurrenceModal";
import {
  formatUtcTime,
  isClassCompleted,
  utcHHMMSSToLocalHHMM,
  localHHMMToUtcHHMMSS,
} from "@/lib/utils";

type Tab = "calendar" | "classes" | "workouts" | "members";

export default function EditProgramPage() {
  const { gymId, programId } = useParams();
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("calendar");

  const [gymView, setGymView] = useState(false);
  const [editingProgram, setEditingProgram] = useState(false);
  const [programForm, setProgramForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
  });
  const [savingProgram, setSavingProgram] = useState(false);

  useEffect(() => {
    loadProgram();
  }, [gymId, programId]);

  async function loadProgram() {
    try {
      const programs = await apiFetch(`/gyms/${gymId}/programs`);
      const p = programs?.find((pr: any) => pr.id === programId);
      if (p) {
        setProgram(p);
        setProgramForm({
          name: p.name,
          description: p.description || "",
          start_date: p.start_date || "",
          end_date: p.end_date || "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProgram() {
    setSavingProgram(true);
    try {
      const updated = await apiFetch(`/gyms/${gymId}/programs/${programId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: programForm.name,
          description: programForm.description || null,
          start_date: programForm.start_date || null,
          end_date: programForm.end_date || null,
        }),
      });
      setProgram(updated);
      setEditingProgram(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProgram(false);
    }
  }

  if (loading)
    return <p className="text-[var(--color-ink-soft)]">Loading…</p>;
  if (!program)
    return <p className="text-[var(--color-ink-soft)]">Program not found.</p>;

  const tabs: { key: Tab; label: string; icon: typeof Dumbbell }[] = [
    { key: "calendar", label: "Calendar", icon: CalendarDays },
    { key: "classes", label: "Classes", icon: LayoutGrid },
    { key: "workouts", label: "Workouts", icon: Dumbbell },
    { key: "members", label: "Members", icon: Users },
  ];

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const dateRange = program.start_date
    ? program.end_date
      ? `${fmtDate(program.start_date)} — ${fmtDate(program.end_date)}`
      : `${fmtDate(program.start_date)} — Ongoing`
    : null;

  return (
    <div>
      <div className="mb-4">
        <BackButton href={`/gym/${gymId}?tab=programs`} label="Programs" />
      </div>

      {editingProgram ? (
        <section className="rounded-xl border border-[var(--color-accent-rule)] bg-[var(--color-bg-card)] shadow-[var(--shadow-soft)] p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent-rule)]" />
            <h2 className="font-display text-base font-semibold tracking-tight">
              Edit program
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                Program name
              </label>
              <input
                className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                value={programForm.name}
                onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                Description
              </label>
              <textarea
                className="rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                value={programForm.description}
                onChange={(e) =>
                  setProgramForm({ ...programForm, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                  Start date
                </label>
                <input
                  type="date"
                  value={programForm.start_date}
                  onChange={(e) =>
                    setProgramForm({ ...programForm, start_date: e.target.value })
                  }
                  className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                  End date <span className="normal-case tracking-normal text-[var(--color-ink-muted)]">(optional)</span>
                </label>
                <input
                  type="date"
                  value={programForm.end_date}
                  onChange={(e) =>
                    setProgramForm({ ...programForm, end_date: e.target.value })
                  }
                  className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setEditingProgram(false)}
                className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProgram}
                disabled={savingProgram || !programForm.name.trim()}
                className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
              >
                {savingProgram ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight">
                {program.name}
              </h1>
              <button
                onClick={() => setEditingProgram(true)}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-[var(--color-rule)] text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors"
              >
                <Pencil size={12} strokeWidth={1.75} />
                Edit
              </button>
            </div>
            {program.description && (
              <p className="text-[14px] text-[var(--color-ink-soft)] mt-2 leading-relaxed max-w-2xl">
                {program.description}
              </p>
            )}
            {dateRange && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-muted)] tabular-nums">
                <CalendarDays size={12} strokeWidth={1.75} />
                {dateRange}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setGymView((v) => !v)}
            role="switch"
            aria-checked={gymView}
            className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[12.5px] font-medium border transition-colors shrink-0 ${
              gymView
                ? "bg-[var(--color-ink)] text-white border-[var(--color-ink)] hover:bg-[var(--color-ink-soft)]"
                : "bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] border-[var(--color-rule)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)]"
            }`}
            title="Stepped view for recording results on the gym floor"
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                gymView ? "bg-[var(--color-accent)]" : "bg-[var(--color-ink-faint)]"
              }`}
            />
            Gym View · {gymView ? "On" : "Off"}
          </button>
        </section>
      )}

      {gymView ? (
        <GymViewSection gymId={gymId as string} programId={programId as string} />
      ) : (
        <>
          <div
            role="tablist"
            className="border-b border-[var(--color-rule)] flex gap-1 mb-6"
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
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
                  {tab.label}
                  {active && (
                    <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-[var(--color-accent)]" />
                  )}
                </button>
              );
            })}
          </div>

          {activeTab === "calendar" && (
            <ProgramCalendarSection
              gymId={gymId as string}
              programId={programId as string}
            />
          )}
          {activeTab === "classes" && (
            <ClassesSection gymId={gymId as string} programId={programId as string} />
          )}
          {activeTab === "workouts" && (
            <WorkoutsSection programId={programId as string} gymId={gymId as string} />
          )}
          {activeTab === "members" && (
            <MembersSection
              gymId={gymId as string}
              programId={programId as string}
            />
          )}
        </>
      )}
    </div>
  );
}

/* -------------------- Members tab (program) -------------------- */

type ProgramMember = {
  id: string;
  user_id: string;
  status: "active" | "inactive";
  created_at: string;
  profile: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
  subscriptions: {
    id: string;
    status: string;
    period_end: string | null;
    plan: {
      id: string;
      name: string;
      price_cents: number;
      type: "monthly" | "annual" | "count";
      class_count: number | null;
    } | null;
  }[];
};

const PROG_PAGE_SIZES = [10, 50, 100] as const;

function ProgPaginationBar({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[var(--color-ink-muted)]">Show</span>
        <div className="inline-flex gap-0.5 p-0.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)]">
          {PROG_PAGE_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => onPageSizeChange(s)}
              className={`h-6 px-2 rounded text-[11px] font-medium tabular-nums transition-colors ${
                pageSize === s
                  ? "bg-[var(--color-ink)] text-white"
                  : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[var(--color-ink-muted)] tabular-nums">
          {start}–{end} of {total}
        </span>
        <div className="flex gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="h-7 w-7 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-[12px]"
          >
            ‹
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="h-7 w-7 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-[12px]"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

function MembersSection({
  gymId,
  programId,
}: {
  gymId: string;
  programId: string;
}) {
  const [rows, setRows] = useState<ProgramMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [query, setQuery] = useState("");
  const [mPage, setMPage] = useState(1);
  const [mPageSize, setMPageSize] = useState<number>(10);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch(
          `/gyms/${gymId}/programs/${programId}/enrollments`,
        );
        setRows(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [gymId, programId]);

  const counts = {
    all: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    inactive: rows.filter((r) => r.status !== "active").length,
  };

  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (!q) return true;
    const name = `${r.profile?.first_name || ""} ${
      r.profile?.last_name || ""
    }`.toLowerCase();
    const email = (r.profile?.email || "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const paginated = useMemo(() => {
    const start = (mPage - 1) * mPageSize;
    return filtered.slice(start, start + mPageSize);
  }, [filtered, mPage, mPageSize]);

  // Reset page when filters change
  useEffect(() => {
    setMPage(1);
  }, [query, filter]);

  if (loading)
    return <p className="text-[var(--color-ink-soft)]">Loading members…</p>;

  return (
    <section>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[10.5px] font-medium tracking-[0.14em] uppercase text-[var(--color-ink-muted)]">
            Enrollment
          </p>
          <h2 className="font-display text-xl font-semibold tracking-tight mt-0.5">
            Members
          </h2>
          <p className="text-[13px] text-[var(--color-ink-soft)] mt-0.5">
            Everyone enrolled in this program. Manage enrollments from the Members panel on the gym page.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex gap-1.5 p-1 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)] w-fit">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-7 px-3 rounded text-xs font-medium capitalize transition-colors flex items-center gap-1.5 ${
                filter === f
                  ? "bg-[var(--color-bg-card)] text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              }`}
            >
              {f}
              <span
                className={`tabular-nums text-[10px] px-1.5 rounded-full ${
                  filter === f
                    ? "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)]"
                    : "bg-[var(--color-bg-card)] text-[var(--color-ink-muted)]"
                }`}
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email"
          className="h-9 w-64 max-w-full rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
        />
      </div>

      <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center mb-3">
              <Users
                size={16}
                className="text-[var(--color-ink-muted)]"
                strokeWidth={1.75}
              />
            </div>
            <p className="text-[13px] text-[var(--color-ink-muted)]">
              {rows.length === 0
                ? "No members enrolled in this program yet."
                : "No members match the current filters."}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
                <th className="text-left px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Member
                </th>
                <th className="text-left px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Membership
                </th>
                <th className="text-left px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Enrolled
                </th>
                <th className="text-right px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((m) => {
                const isActive = m.status === "active";
                const sub = m.subscriptions.find((s) => s.status === "active");
                const priceCents = sub?.plan?.price_cents ?? 0;
                const initials = `${(m.profile?.first_name?.[0] || "").toUpperCase()}${(
                  m.profile?.last_name?.[0] || ""
                ).toUpperCase()}`;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-[var(--color-rule)] last:border-b-0 hover:bg-[var(--color-bg-sunken)] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/gym/${gymId}/members/${m.user_id}`}
                        className="flex items-center gap-3 no-underline text-[var(--color-ink)]"
                      >
                        <div className="w-9 h-9 rounded-full bg-[var(--color-bg-soft)] ring-1 ring-[var(--color-rule)] flex items-center justify-center overflow-hidden shrink-0">
                          {m.profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.profile.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[11px] font-semibold text-[var(--color-ink-soft)]">
                              {initials || "—"}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-medium truncate">
                            {m.profile?.first_name} {m.profile?.last_name}
                          </div>
                          <div className="text-[11.5px] text-[var(--color-ink-muted)] truncate">
                            {m.profile?.email || "—"}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {sub ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-medium text-[var(--color-ink)] truncate max-w-[160px]">
                            {sub.plan?.name || "Plan"}
                          </span>
                          <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] text-[10.5px] font-semibold tabular-nums">
                            ${(priceCents / 100).toFixed(0)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[12px] text-[var(--color-ink-muted)]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[var(--color-ink-soft)] tabular-nums">
                        {new Date(m.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {filtered.length > PROG_PAGE_SIZES[0] && (
          <ProgPaginationBar
            total={filtered.length}
            page={mPage}
            pageSize={mPageSize}
            onPageChange={setMPage}
            onPageSizeChange={(s) => {
              setMPageSize(s);
              setMPage(1);
            }}
          />
        )}
      </div>
    </section>
  );
}

// =============================================
// GYM VIEW (stepped: calendar → day → class → user → results)
// =============================================

function GymViewSection({
  gymId,
  programId,
}: {
  gymId: string;
  programId: string;
}) {
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [selectedUser, setSelectedUser] =
    useState<{ userId: string; name: string } | null>(null);
  // Anchor date for the visible week strip (any date within the week).
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date());

  // Zoom for TV display. Persisted to localStorage so the setting survives reloads.
  const ZOOM_STEPS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const [zoom, setZoom] = useState<number>(1);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = parseFloat(window.localStorage.getItem("acuo:gymViewZoom") || "");
    if (!Number.isNaN(stored) && ZOOM_STEPS.includes(stored)) setZoom(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function setZoomAndPersist(next: number) {
    setZoom(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("acuo:gymViewZoom", String(next));
    }
  }
  const zoomIndex = ZOOM_STEPS.indexOf(zoom) === -1 ? 0 : ZOOM_STEPS.indexOf(zoom);
  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex < ZOOM_STEPS.length - 1;

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/programs/${programId}/classes`);
        setClasses(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, [programId]);

  const crumbs: { label: string; onClick?: () => void }[] = [];
  if (selectedDate)
    crumbs.push({
      label: new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    });
  if (selectedClass)
    crumbs.push({
      label: selectedClass.name,
      onClick: selectedUser
        ? () => setSelectedUser(null)
        : undefined,
    });
  if (selectedUser) crumbs.push({ label: selectedUser.name });

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar: breadcrumbs + zoom controls. These stay at 100% so they're not
          affected by the zoom level applied to the content below. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <nav className="flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)] flex-wrap">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[var(--color-ink-faint)]">/</span>}
              {c.onClick ? (
                <button
                  type="button"
                  onClick={c.onClick}
                  className="hover:text-[var(--color-ink)] hover:underline"
                >
                  {c.label}
                </button>
              ) : (
                <span className="font-semibold text-[var(--color-ink)]">{c.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div
          className="flex items-center gap-1 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-1 py-0.5"
          title="Zoom for TV display"
        >
          <button
            type="button"
            onClick={() => canZoomOut && setZoomAndPersist(ZOOM_STEPS[zoomIndex - 1])}
            disabled={!canZoomOut}
            aria-label="Zoom out"
            className="h-8 w-8 rounded text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)] disabled:opacity-40 text-lg font-semibold"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoomAndPersist(1)}
            className="h-8 min-w-[3.5rem] px-2 rounded text-xs font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)] tabular-nums"
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => canZoomIn && setZoomAndPersist(ZOOM_STEPS[zoomIndex + 1])}
            disabled={!canZoomIn}
            aria-label="Zoom in"
            className="h-8 w-8 rounded text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)] disabled:opacity-40 text-lg font-semibold"
          >
            +
          </button>
        </div>
      </div>

      {/* Zoomed content. `zoom` scales both size and layout, keeping everything
          pixel-crisp (unlike CSS `transform: scale`). Supported in modern
          Chrome/Safari/Firefox. */}
      <div style={{ zoom }} className="flex flex-col gap-4">
        <GymViewWeekStrip
          anchor={weekAnchor}
          classes={classes}
          loading={loadingClasses}
          selectedDate={selectedDate}
          onNavigate={(dir) => {
            const next = new Date(weekAnchor);
            next.setDate(next.getDate() + dir * 7);
            setWeekAnchor(next);
          }}
          onPickDay={(iso) => {
            setSelectedDate(iso);
            // Clear downstream selection when switching days.
            setSelectedClass(null);
            setSelectedUser(null);
          }}
          onToday={() => setWeekAnchor(new Date())}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,340px)_1fr] gap-4">
          {/* Left: classes for selected day */}
          <div>
            {selectedDate ? (
              <GymViewDayList
                date={selectedDate}
                classes={classes}
                selectedClassId={selectedClass?.id || null}
                onPickClass={(cls) => {
                  setSelectedClass(cls);
                  setSelectedUser(null);
                }}
              />
            ) : (
              <EmptyPanel
                title="Pick a day"
                body="Select any day from the week strip above to see its classes."
              />
            )}
          </div>

          {/* Right: class tabs (workouts/members) or user results */}
          <div>
            {selectedClass && selectedDate ? (
              selectedUser ? (
                <GymViewUserResults
                  programId={programId}
                  date={selectedDate}
                  cls={selectedClass}
                  userId={selectedUser.userId}
                  name={selectedUser.name}
                  onBack={() => setSelectedUser(null)}
                />
              ) : (
                <GymViewClass
                  gymId={gymId}
                  programId={programId}
                  date={selectedDate}
                  cls={selectedClass}
                  onPickUser={(userId, name) => {
                    setSelectedUser({ userId, name });
                  }}
                />
              )
            ) : selectedDate ? (
              <EmptyPanel
                title="Pick a class"
                body="Choose a class from the left to see workouts and members."
              />
            ) : (
              <EmptyPanel
                title="No class selected"
                body="Pick a day, then pick a class."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-rule-strong)] bg-[var(--color-bg-sunken)] p-8 text-center">
      <p className="text-sm font-semibold text-[var(--color-ink-soft)]">{title}</p>
      <p className="text-xs text-[var(--color-ink-muted)] mt-1">{body}</p>
    </div>
  );
}

function GymViewWeekStrip({
  anchor,
  classes,
  loading,
  selectedDate,
  onNavigate,
  onPickDay,
  onToday,
}: {
  anchor: Date;
  classes: any[];
  loading: boolean;
  selectedDate: string | null;
  onNavigate: (dir: number) => void;
  onPickDay: (iso: string) => void;
  onToday: () => void;
}) {
  function toIso(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const start = new Date(anchor);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  const todayIso = toIso(new Date());
  const rangeLabel = `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${days[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
        >
          ← Prev week
        </button>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">{rangeLabel}</h3>
          <button
            type="button"
            onClick={onToday}
            className="h-7 px-2 rounded text-xs font-medium text-[var(--color-ink-soft)] border border-[var(--color-rule-strong)] hover:bg-[var(--color-bg-soft)]"
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(1)}
          className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
        >
          Next week →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const iso = toIso(d);
          const count = loading ? 0 : classesForDateIso(iso, classes).length;
          const isSelected = iso === selectedDate;
          const isToday = iso === todayIso;
          const weekdayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPickDay(iso)}
              className={`rounded-lg border p-2 text-left transition-colors ${
                isSelected
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                  : "border-[var(--color-rule)] hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] text-[var(--color-ink)]"
              } ${isToday && !isSelected ? "ring-2 ring-[var(--color-accent)]" : ""}`}
            >
              <div
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  isSelected ? "text-white/70" : "text-[var(--color-ink-muted)]"
                }`}
              >
                {weekdayLabel}
              </div>
              <div className="text-2xl font-bold leading-tight mt-0.5">
                {d.getDate()}
              </div>
              <div
                className={`text-xs mt-1 ${
                  isSelected ? "text-white/80" : "text-[var(--color-ink-soft)]"
                }`}
              >
                {loading
                  ? "…"
                  : count === 0
                  ? "—"
                  : `${count} ${count === 1 ? "class" : "classes"}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GymViewDayList({
  date,
  classes,
  selectedClassId,
  onPickClass,
}: {
  date: string;
  classes: any[];
  selectedClassId: string | null;
  onPickClass: (cls: any) => void;
}) {
  const list = classesForDateIso(date, classes);
  const label = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-4 h-full">
      <div className="mb-3">
        <h3 className="text-base font-semibold">{label}</h3>
        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
          {list.length === 0
            ? "No classes scheduled"
            : `${list.length} class${list.length === 1 ? "" : "es"}`}
        </p>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)] py-6 text-center">Nothing on this day.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((cls) => {
            const isSelected = cls.id === selectedClassId;
            const done = isClassCompleted(date, cls.start_time, cls.duration_minutes);
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => onPickClass(cls)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                    : "border-[var(--color-rule)] hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
                }`}
              >
                <div
                  className={`w-16 shrink-0 text-sm font-mono font-semibold ${
                    isSelected ? "text-white" : "text-[var(--color-ink)]"
                  }`}
                >
                  {formatTimeLabel(cls.start_time, date)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1.5">
                    {done && (
                      <span
                        title="Completed"
                        className={`inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold shrink-0 ${
                          isSelected ? "bg-white/20 text-white" : "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"
                        }`}
                      >
                        ✓
                      </span>
                    )}
                    <span className="truncate">{cls.name}</span>
                  </div>
                  {cls.duration_minutes && (
                    <div
                      className={`text-xs ${
                        isSelected ? "text-white/70" : "text-[var(--color-ink-muted)]"
                      }`}
                    >
                      {cls.duration_minutes} min
                      {cls.capacity ? ` · cap ${cls.capacity}` : ""}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function classesForDateIso(iso: string, classes: any[]) {
  const d = new Date(iso + "T00:00:00");
  const dow = d.getDay();
  return classes
    .filter((cls) => {
      if (cls.one_off_date) return cls.one_off_date === iso;
      const days: number[] = cls.days_of_week || [];
      return days.includes(dow);
    })
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
}

function formatTimeLabel(hhmmss: string | null | undefined, date?: string) {
  if (!hhmmss) return "No time";
  return formatUtcTime(hhmmss, date);
}

function GymViewClass({
  gymId,
  programId,
  date,
  cls,
  onPickUser,
}: {
  gymId: string;
  programId: string;
  date: string;
  cls: any;
  onPickUser: (userId: string, name: string) => void;
}) {
  const [occurrence, setOccurrence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(true);
  const [tab, setTab] = useState<"workouts" | "members">("workouts");

  useEffect(() => {
    (async () => {
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
    })();
  }, [cls.id, date]);

  useEffect(() => {
    (async () => {
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
    })();
  }, [programId, cls.id, date]);

  const signups: any[] = occurrence?.signups || [];
  const timeLabel = formatTimeLabel(cls.start_time, date);
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const tabs: { key: "workouts" | "members"; label: string; count: number }[] = [
    { key: "workouts", label: "Workouts", count: workouts.length },
    { key: "members", label: "Members", count: signups.length },
  ];

  return (
    <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{cls.name}</h3>
        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
          {dateLabel} · {timeLabel}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b border-[var(--color-rule)]">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 border-b-2 text-sm transition-colors -mb-px ${
                active
                  ? "border-[var(--color-ink)] text-[var(--color-ink)] font-semibold"
                  : "border-transparent text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
              }`}
            >
              {t.label}
              <span
                className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                  active ? "bg-[var(--color-ink)] text-white" : "bg-[var(--color-rule)] text-[var(--color-ink-soft)]"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "workouts" && (
        <>
          {workoutsLoading ? (
            <p className="text-sm text-[var(--color-ink-muted)] py-8 text-center">Loading workouts...</p>
          ) : workouts.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)] py-8 text-center">
              No workouts scheduled for this class on this day.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {workouts.map((w) => {
                const scopedToAll = (w.class_ids || []).length === 0;
                return (
                  <div
                    key={w.id}
                    className="rounded-lg border border-[var(--color-rule)] px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          w.format === "time"
                            ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"
                            : "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"
                        }`}
                      >
                        {w.format}
                      </span>
                      <span className="text-sm font-semibold">{w.title}</span>
                      <Link
                        href={`/gym/${gymId}/workouts/${w.id}`}
                        className="ml-auto text-[11px] font-medium text-[var(--color-accent-ink)] hover:underline"
                      >
                        View leaderboard →
                      </Link>
                    </div>
                    {w.description && (
                      <p className="text-xs text-[var(--color-ink-soft)] mt-1.5 whitespace-pre-wrap">
                        {w.description}
                      </p>
                    )}
                    <div className="text-[11px] text-[var(--color-ink-muted)] mt-1.5">
                      {scopedToAll ? "Applies to all classes" : "This class only"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "members" && (
        <>
          {loading ? (
            <p className="text-sm text-[var(--color-ink-muted)] py-8 text-center">Loading attendees...</p>
          ) : error ? (
            <p className="text-sm text-red-600 py-4">{error}</p>
          ) : signups.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)] py-8 text-center">
              Nobody signed up for this class yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {signups.map((s) => {
                const name = `${s.profile?.first_name || ""} ${
                  s.profile?.last_name || ""
                }`.trim() || "Member";
                const initials =
                  `${s.profile?.first_name?.[0] || ""}${
                    s.profile?.last_name?.[0] || ""
                  }`.toUpperCase() || "?";
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPickUser(s.user_id, name)}
                    className="flex items-center gap-3 rounded-lg border border-[var(--color-rule)] px-4 py-3 hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--color-rule)] flex items-center justify-center">
                      <span className="text-sm font-bold text-[var(--color-ink-soft)]">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{name}</div>
                      <div className="text-xs text-[var(--color-ink-muted)]">
                        {s.checked_in ? (
                          <span className="text-[var(--color-accent-ink)]">Checked in</span>
                        ) : (
                          "Not checked in"
                        )}
                      </div>
                    </div>
                    <div className="text-[var(--color-ink-faint)] text-lg">›</div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GymViewUserResults({
  programId,
  date,
  cls,
  userId,
  name,
  onBack,
}: {
  programId: string;
  date: string;
  cls: any;
  userId: string;
  name: string;
  onBack: () => void;
}) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch(
          `/programs/${programId}/workouts?start=${date}&end=${date}`,
        );
        const relevant = (data || []).filter((w: any) => {
          const ids: string[] = w.class_ids || [];
          return ids.length === 0 || ids.includes(cls.id);
        });
        setWorkouts(relevant);

        // Load this user's stats for each workout.
        const results = await Promise.all(
          relevant.map(async (w: any) => {
            try {
              const rows = await apiFetch(`/workouts/${w.id}/stats`);
              const mine = (rows || []).find((r: any) => r.user_id === userId);
              return [w.id, mine] as const;
            } catch {
              return [w.id, undefined] as const;
            }
          }),
        );
        const map: Record<string, any> = {};
        for (const [wid, stat] of results) if (stat) map[wid] = stat;
        setStats(map);
      } catch (err: any) {
        setError(err?.message || "Failed to load workouts");
      } finally {
        setLoading(false);
      }
    })();
  }, [programId, date, cls.id, userId]);

  return (
    <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
            Record results for {cls.name} · {formatTimeLabel(cls.start_time, date)}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
        >
          ← Attendees
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)] py-8 text-center">Loading workouts...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : workouts.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)] py-8 text-center">
          No workouts scheduled for this class on this day.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {workouts.map((w) => (
            <GymViewResultEntry
              key={w.id}
              workout={w}
              userId={userId}
              stat={stats[w.id]}
              onSaved={(s) => setStats((prev) => ({ ...prev, [w.id]: s }))}
              onCleared={() =>
                setStats((prev) => {
                  const copy = { ...prev };
                  delete copy[w.id];
                  return copy;
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GymViewResultEntry({
  workout,
  userId,
  stat,
  onSaved,
  onCleared,
}: {
  workout: any;
  userId: string;
  stat: any | undefined;
  onSaved: (stat: any) => void;
  onCleared: () => void;
}) {
  const format = workout.format as "time" | "amrap";
  const initialMin = stat?.time_seconds != null ? String(Math.floor(stat.time_seconds / 60)) : "";
  const initialSec =
    stat?.time_seconds != null
      ? String(stat.time_seconds % 60).padStart(2, "0")
      : "";
  const [min, setMin] = useState(initialMin);
  const [sec, setSec] = useState(initialSec);
  const [rounds, setRounds] = useState(
    stat?.amrap_rounds != null ? String(stat.amrap_rounds) : "",
  );
  const [reps, setReps] = useState(
    stat?.amrap_reps != null ? String(stat.amrap_reps) : "",
  );
  const [rxScaled, setRxScaled] = useState<"rx" | "scaled" | null>(
    stat?.rx_scaled ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const body: Record<string, any> = { user_id: userId, rx_scaled: rxScaled };
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
      const updated = await apiFetch(`/workouts/${workout.id}/stats`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e: any) {
      setErr(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!stat) {
      setMin("");
      setSec("");
      setRounds("");
      setReps("");
      setRxScaled(null);
      return;
    }
    if (!confirm("Clear this result?")) return;
    setSaving(true);
    try {
      await apiFetch(`/workout-stats/${stat.id}`, { method: "DELETE" });
      onCleared();
      setMin("");
      setSec("");
      setRounds("");
      setReps("");
      setRxScaled(null);
    } catch (e: any) {
      setErr(e?.message || "Failed to clear");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-rule)] p-4 bg-[var(--color-bg-sunken)]">
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
            format === "time"
              ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"
              : "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"
          }`}
        >
          {format}
        </span>
        <span className="text-base font-semibold">{workout.title}</span>
      </div>
      {workout.description && (
        <p className="text-xs text-[var(--color-ink-soft)] mb-3 whitespace-pre-wrap">
          {workout.description}
        </p>
      )}

      {format === "time" ? (
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[var(--color-ink-soft)]">Minutes</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="w-24 h-11 rounded border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-lg text-right"
            />
          </div>
          <div className="h-11 flex items-center text-lg text-[var(--color-ink-faint)]">:</div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[var(--color-ink-soft)]">Seconds</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={sec}
              onChange={(e) => setSec(e.target.value)}
              className="w-24 h-11 rounded border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-lg text-right"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[var(--color-ink-soft)]">Rounds</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
              className="w-24 h-11 rounded border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-lg text-right"
            />
          </div>
          <div className="h-11 flex items-center text-lg text-[var(--color-ink-faint)]">+</div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[var(--color-ink-soft)]">Reps</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-24 h-11 rounded border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-lg text-right"
            />
          </div>
        </div>
      )}

      <div className="flex gap-1.5 mt-3">
        {(["rx", "scaled"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setRxScaled(rxScaled === opt ? null : opt)}
            className={`h-8 px-3 rounded-full text-[12px] font-medium border transition-colors ${
              rxScaled === opt
                ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-accent-rule)]"
                : "bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] border-[var(--color-rule)] hover:text-[var(--color-ink)]"
            }`}
          >
            {opt === "rx" ? "Rx" : "Scaled"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save result"}
        </button>
        {stat && (
          <button
            type="button"
            onClick={handleClear}
            disabled={saving}
            className="h-10 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)] disabled:opacity-60"
          >
            Clear
          </button>
        )}
        {saved && <span className="text-xs text-[var(--color-accent-ink)] font-medium">Saved ✓</span>}
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  );
}

// =============================================
// CALENDAR SECTION (program-scoped)
// =============================================

function ProgramCalendarSection({
  gymId,
  programId,
}: {
  gymId: string;
  programId: string;
}) {
  const [classes, setClasses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ cls: any; date: string } | null>(null);

  useEffect(() => {
    if (!programId || !gymId) return;
    (async () => {
      try {
        const [classesData, membersData, profileData] = await Promise.all([
          apiFetch(`/programs/${programId}/classes`),
          apiFetch(`/gyms/${gymId}/members`).catch(() => []),
          apiFetch(`/profile`).catch(() => null),
        ]);
        setClasses(classesData || []);
        setMembers(membersData || []);
        setCurrentUserId(profileData?.id || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [gymId, programId]);

  return (
    <>
      <ClassCalendar
        classes={classes}
        loading={loading}
        groupByProgram={false}
        onClassClick={(cls, date) => setSelected({ cls, date })}
      />
      {selected && (
        <ClassOccurrenceModal
          cls={selected.cls}
          date={selected.date}
          gymId={gymId as string}
          currentUserId={currentUserId}
          canManage
          members={members}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// =============================================
// CLASSES SECTION
// =============================================

function ClassesSection({ gymId, programId }: { gymId: string; programId: string }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<
    { mode: "create" } | { mode: "edit"; cls: any } | null
  >(null);
  const [filter, setFilter] = useState<"all" | "recurring" | "oneoff">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadClasses();
    loadCoaches();
  }, [programId]);

  async function loadClasses() {
    try {
      const data = await apiFetch(`/programs/${programId}/classes`);
      setClasses(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCoaches() {
    try {
      const members = await apiFetch(`/gyms/${gymId}/members`);
      const coachList = (members || []).filter((m: any) =>
        (m.roles || []).some((r: string) => r === "coach" || r === "admin"),
      );
      setCoaches(coachList);
    } catch (err) {
      console.error(err);
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

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayLabelsShort = ["S", "M", "T", "W", "T", "F", "S"];

  if (loading)
    return <p className="text-[var(--color-ink-soft)]">Loading classes…</p>;

  const counts = {
    all: classes.length,
    recurring: classes.filter((c) => !c.one_off_date).length,
    oneoff: classes.filter((c) => !!c.one_off_date).length,
  };
  const q = query.trim().toLowerCase();
  const filtered = classes.filter((c) => {
    if (filter === "recurring" && c.one_off_date) return false;
    if (filter === "oneoff" && !c.one_off_date) return false;
    if (!q) return true;
    const coachName = `${c.coach?.first_name || ""} ${c.coach?.last_name || ""}`.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(q) || coachName.includes(q)
    );
  });

  // Sort: recurring first by earliest day-of-week + time; one-offs by date.
  filtered.sort((a, b) => {
    if (!!a.one_off_date !== !!b.one_off_date) {
      return a.one_off_date ? 1 : -1;
    }
    if (a.one_off_date && b.one_off_date) {
      return a.one_off_date.localeCompare(b.one_off_date);
    }
    const aDay = Math.min(...(a.days_of_week?.length ? a.days_of_week : [7]));
    const bDay = Math.min(...(b.days_of_week?.length ? b.days_of_week : [7]));
    if (aDay !== bDay) return aDay - bDay;
    return (a.start_time || "").localeCompare(b.start_time || "");
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[10.5px] font-medium tracking-[0.14em] uppercase text-[var(--color-ink-muted)]">
            Schedule
          </p>
          <h2 className="font-display text-xl font-semibold tracking-tight mt-0.5">
            Classes
          </h2>
          <p className="text-[13px] text-[var(--color-ink-soft)] mt-0.5">
            Recurring rules that generate class occurrences on the calendar.
          </p>
        </div>
        <button
          onClick={() => setModalState({ mode: "create" })}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors shrink-0"
        >
          <Plus size={14} strokeWidth={2.25} />
          Add class
        </button>
      </div>

      {modalState && (
        <ClassModal
          gymId={gymId}
          programId={programId}
          coaches={coaches}
          initial={modalState.mode === "edit" ? modalState.cls : null}
          onClose={() => setModalState(null)}
          onSaved={() => {
            setModalState(null);
            loadClasses();
          }}
        />
      )}

      {classes.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex gap-1.5 p-1 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)] w-fit">
            {(
              [
                { key: "all", label: "All" },
                { key: "recurring", label: "Recurring" },
                { key: "oneoff", label: "One-off" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`h-7 px-3 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filter === f.key
                    ? "bg-[var(--color-bg-card)] text-[var(--color-ink)] shadow-sm"
                    : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                }`}
              >
                {f.label}
                <span
                  className={`tabular-nums text-[10px] px-1.5 rounded-full ${
                    filter === f.key
                      ? "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)]"
                      : "bg-[var(--color-bg-card)] text-[var(--color-ink-muted)]"
                  }`}
                >
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or coach"
            className="h-9 w-64 max-w-full rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
          />
        </div>
      )}

      {classes.length === 0 ? (
        <div className="border border-[var(--color-rule)] rounded-xl p-12 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center mb-3">
            <LayoutGrid
              size={16}
              className="text-[var(--color-ink-muted)]"
              strokeWidth={1.75}
            />
          </div>
          <p className="text-[var(--color-ink-soft)] text-sm">
            No classes yet. Add your first class to this program.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-[var(--color-rule)] rounded-xl p-10 text-center">
          <p className="text-[var(--color-ink-muted)] text-sm">
            No classes match the current filters.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((cls) => {
            const isOneOff = !!cls.one_off_date;
            const daysSet = new Set<number>(cls.days_of_week || []);
            const coachName = cls.coach
              ? `${cls.coach.first_name || ""} ${cls.coach.last_name || ""}`.trim()
              : null;
            return (
              <div
                key={cls.id}
                className="group flex items-start gap-4 p-4 bg-[var(--color-bg-card)] border border-[var(--color-rule)] rounded-xl hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-soft)] transition-all"
              >
                {/* Time tile */}
                <div className="shrink-0 w-20 flex flex-col items-center justify-center rounded-lg border border-[var(--color-rule)] bg-[var(--color-bg-sunken)] py-2.5">
                  <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--color-ink-muted)]">
                    {isOneOff ? "On" : "At"}
                  </span>
                  <span className="font-display text-[15px] font-semibold tabular-nums leading-tight text-[var(--color-ink)] mt-0.5">
                    {formatTimeLabel(
                      cls.start_time,
                      cls.one_off_date || undefined,
                    )}
                  </span>
                  <span className="text-[10px] text-[var(--color-ink-muted)] tabular-nums mt-0.5">
                    {cls.duration_minutes}m
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-[15px] font-semibold leading-tight tracking-tight truncate">
                      {cls.name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${
                        isOneOff
                          ? "border-[var(--color-rule)] bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)]"
                          : "border-[var(--color-accent-rule)] bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"
                      }`}
                    >
                      {isOneOff ? (
                        <>
                          <CalendarDays size={10} strokeWidth={2} />
                          One-off
                        </>
                      ) : (
                        <>
                          <Repeat size={10} strokeWidth={2} />
                          Recurring
                        </>
                      )}
                    </span>
                  </div>

                  {/* Schedule row */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {isOneOff ? (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-soft)] tabular-nums">
                        <CalendarDays
                          size={11}
                          strokeWidth={1.75}
                          className="text-[var(--color-ink-muted)]"
                        />
                        {new Date(
                          cls.one_off_date + "T00:00:00",
                        ).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    ) : (
                      <div className="inline-flex gap-0.5">
                        {dayLabelsShort.map((d, i) => {
                          const on = daysSet.has(i);
                          return (
                            <span
                              key={i}
                              title={dayLabels[i]}
                              className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-semibold tabular-nums ${
                                on
                                  ? "bg-[var(--color-ink)] text-white"
                                  : "bg-[var(--color-bg-sunken)] text-[var(--color-ink-faint)] border border-[var(--color-rule)]"
                              }`}
                            >
                              {d}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="mt-2 flex items-center gap-4 flex-wrap text-[11.5px] text-[var(--color-ink-muted)]">
                    {coachName ? (
                      <span className="inline-flex items-center gap-1.5 text-[var(--color-ink-soft)]">
                        <User size={11} strokeWidth={1.75} />
                        {coachName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 italic">
                        <User size={11} strokeWidth={1.75} />
                        No coach assigned
                      </span>
                    )}
                    {cls.capacity != null && cls.capacity > 0 && (
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Users size={11} strokeWidth={1.75} />
                        {cls.capacity} cap
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setModalState({ mode: "edit", cls })}
                    aria-label="Edit class"
                    className="h-8 w-8 rounded-md border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] flex items-center justify-center transition-colors"
                  >
                    <Pencil size={12} strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => handleDelete(cls.id)}
                    aria-label="Delete class"
                    className="h-8 w-8 rounded-md border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={12} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================
// WORKOUTS SECTION (Calendar)
// =============================================

function WorkoutsSection({ programId, gymId }: { programId: string; gymId: string }) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    async function loadClasses() {
      try {
        const data = await apiFetch(`/programs/${programId}/classes`);
        setClasses(data || []);
      } catch (err) {
        console.error(err);
      }
    }
    if (programId) loadClasses();
  }, [programId]);

  useEffect(() => {
    const date = new Date(selectedDate + "T00:00:00");
    const day = date.getDay();
    const start = new Date(date);
    start.setDate(start.getDate() - day);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    setWeekDates(dates);
  }, [selectedDate]);

  const loadWorkouts = useCallback(async () => {
    if (!programId || weekDates.length < 7) return;
    try {
      const data = await apiFetch(
        `/programs/${programId}/workouts?start=${weekDates[0]}&end=${weekDates[6]}`
      );
      setWorkouts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [programId, weekDates]);

  useEffect(() => {
    if (programId && weekDates.length === 7) {
      setLoading(true);
      loadWorkouts();
    }
  }, [programId, weekDates, loadWorkouts]);

  function navigateWeek(direction: number) {
    const date = new Date(selectedDate + "T00:00:00");
    date.setDate(date.getDate() + direction * 7);
    setSelectedDate(date.toISOString().split("T")[0]);
  }

  async function handleDeleteWorkout(workoutId: string) {
    try {
      await apiFetch(`/workouts/${workoutId}`, { method: "DELETE" });
      loadWorkouts();
    } catch (err) {
      console.error(err);
    }
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().toISOString().split("T")[0];

  const weekTotal = workouts.filter((w) => weekDates.includes(w.date)).length;
  const daysWithWorkouts = new Set(
    workouts.filter((w) => weekDates.includes(w.date)).map((w) => w.date),
  ).size;
  const rangeLabel =
    weekDates[0] && weekDates[6]
      ? `${new Date(weekDates[0] + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} — ${new Date(weekDates[6] + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`
      : "";
  const isThisWeek = weekDates.includes(today);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[10.5px] font-medium tracking-[0.14em] uppercase text-[var(--color-ink-muted)]">
            Programming
          </p>
          <h2 className="font-display text-xl font-semibold tracking-tight mt-0.5">
            Workouts
          </h2>
          <p className="text-[13px] text-[var(--color-ink-soft)] mt-0.5">
            Plan the week ahead. Assign a workout to each class occurrence.
          </p>
        </div>
      </div>

      {/* Week toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
            <button
              onClick={() => navigateWeek(-1)}
              className="h-9 w-9 flex items-center justify-center text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft size={15} strokeWidth={1.75} />
            </button>
            <div className="w-px bg-[var(--color-rule)]" />
            <button
              onClick={() => navigateWeek(1)}
              className="h-9 w-9 flex items-center justify-center text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors"
              aria-label="Next week"
            >
              <ChevronRight size={15} strokeWidth={1.75} />
            </button>
          </div>
          <button
            onClick={() => setSelectedDate(today)}
            disabled={isThisWeek}
            className="h-9 px-3 rounded-md border border-[var(--color-rule)] text-[12.5px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors disabled:opacity-50 disabled:cursor-default"
          >
            This week
          </button>
          <div className="ml-2 font-display text-lg font-semibold tracking-tight tabular-nums">
            {rangeLabel}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11.5px] text-[var(--color-ink-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Dumbbell size={12} strokeWidth={1.75} />
            <span className="tabular-nums text-[var(--color-ink-soft)]">
              {weekTotal}
            </span>{" "}
            workout{weekTotal === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={12} strokeWidth={1.75} />
            <span className="tabular-nums text-[var(--color-ink-soft)]">
              {daysWithWorkouts}
            </span>{" "}
            of 7 days
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[var(--color-rule)] p-12 text-center">
          <p className="text-[var(--color-ink-soft)] text-sm">Loading…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {weekDates.map((date, idx) => {
            const dayWorkouts = workouts
              .filter((w) => w.date === date)
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            const isToday = date === today;
            const isExpanded = expandedDay === date;
            const dateObj = new Date(date + "T00:00:00");

            return (
              <div
                key={date}
                className={`rounded-xl overflow-hidden border bg-[var(--color-bg-card)] transition-all ${
                  isToday
                    ? "border-[var(--color-accent-rule)]"
                    : isExpanded
                      ? "border-[var(--color-ink)]"
                      : "border-[var(--color-rule)]"
                }`}
              >
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : date)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-bg-sunken)] transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    {/* Date tile */}
                    <div
                      className={`shrink-0 w-11 h-11 rounded-lg flex flex-col items-center justify-center border ${
                        isToday
                          ? "border-[var(--color-accent-rule)] bg-[var(--color-accent-soft)]"
                          : "border-[var(--color-rule)] bg-[var(--color-bg-sunken)]"
                      }`}
                    >
                      <span
                        className={`text-[9px] font-semibold tracking-[0.1em] uppercase ${
                          isToday
                            ? "text-[var(--color-accent)]"
                            : "text-[var(--color-ink-muted)]"
                        }`}
                      >
                        {dayNames[idx]}
                      </span>
                      <span
                        className={`text-[15px] font-semibold tabular-nums leading-none ${
                          isToday
                            ? "text-[var(--color-accent-ink)]"
                            : "text-[var(--color-ink)]"
                        }`}
                      >
                        {dateObj.getDate()}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[15px] font-semibold tracking-tight">
                          {dateObj.toLocaleDateString("en-US", {
                            weekday: "long",
                          })}
                        </span>
                        {isToday && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] text-[10px] font-semibold">
                            <span className="h-1 w-1 rounded-full bg-[var(--color-accent)]" />
                            Today
                          </span>
                        )}
                      </div>
                      {dayWorkouts.length === 0 ? (
                        <div className="text-[11.5px] text-[var(--color-ink-muted)] mt-0.5">
                          No workouts planned
                        </div>
                      ) : (
                        <div className="text-[11.5px] text-[var(--color-ink-soft)] mt-0.5 truncate max-w-[360px]">
                          {dayWorkouts
                            .map((w) => w.title)
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {dayWorkouts.length > 0 && (
                      <span className="inline-flex items-center h-6 px-2 rounded-full border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[11px] font-semibold tabular-nums text-[var(--color-ink-soft)]">
                        {dayWorkouts.length}
                      </span>
                    )}
                    <ChevronDown
                      size={15}
                      strokeWidth={1.75}
                      className={`text-[var(--color-ink-muted)] transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--color-rule)] p-4 flex flex-col gap-3 bg-[var(--color-bg-sunken)]">
                    {dayWorkouts.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {dayWorkouts.map((workout, i) => (
                          <WorkoutItem
                            key={workout.id}
                            workout={workout}
                            order={i + 1}
                            classes={classes}
                            date={date}
                            gymId={gymId as string}
                            onDelete={() => handleDeleteWorkout(workout.id)}
                            onUpdated={loadWorkouts}
                          />
                        ))}
                      </div>
                    )}
                    <AddWorkoutForm
                      programId={programId}
                      date={date}
                      nextOrder={dayWorkouts.length}
                      classes={classes}
                      onCreated={loadWorkouts}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClassScopePicker({
  classes,
  selectedClassIds,
  toggleClass,
}: {
  classes: any[];
  selectedClassIds: string[];
  toggleClass: (classId: string) => void;
}) {
  if (classes.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
          Applies to
        </label>
        <p className="text-[11.5px] text-[var(--color-ink-muted)]">
          No classes available for this day.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
        Applies to
      </label>
      <div className="flex flex-wrap gap-1.5">
        {classes.map((cls) => {
          const checked = selectedClassIds.includes(cls.id);
          return (
            <button
              key={cls.id}
              type="button"
              onClick={() => toggleClass(cls.id)}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium border transition-colors ${
                checked
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                  : "border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
              }`}
            >
              {cls.name}
              {cls.start_time && (
                <span
                  className={`tabular-nums text-[10.5px] ${
                    checked ? "text-white/70" : "text-[var(--color-ink-muted)]"
                  }`}
                >
                  {formatTimeLabel(
                    cls.start_time,
                    cls.one_off_date || undefined,
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selectedClassIds.length === 0 && (
        <span className="text-[11.5px] text-[var(--color-ink-muted)]">
          Select at least one class.
        </span>
      )}
    </div>
  );
}

function WorkoutItem({
  workout,
  order,
  classes,
  date,
  gymId,
  onDelete,
  onUpdated,
}: {
  workout: any;
  order: number;
  classes: any[];
  date: string;
  gymId: string;
  onDelete: () => void;
  onUpdated: () => void;
}) {
  const dayClasses = useMemo(() => classesForDateIso(date, classes), [date, classes]);
  const initialClassIds: string[] = workout.class_ids || [];
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: workout.title,
    description: workout.description || "",
    format: workout.format,
    sort_order: workout.sort_order || 0,
  });
  // applyToAll removed — workouts must target at least one class
  const [selectedClassIds, setSelectedClassIds] =
    useState<string[]>(initialClassIds);
  const [saving, setSaving] = useState(false);

  function toggleClass(classId: string) {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId],
    );
  }

  async function handleUpdate() {
    setSaving(true);
    try {
      await apiFetch(`/workouts/${workout.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          format: form.format,
          sort_order: form.sort_order,
          class_ids: selectedClassIds,
        }),
      });
      setEditing(false);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const appliesToLabel =
    initialClassIds.length === 0
      ? "All classes"
      : classes
          .filter((c) => initialClassIds.includes(c.id))
          .map((c) => c.name)
          .join(" · ") || `${initialClassIds.length} classes`;

  const FormatIcon = workout.format === "amrap" ? Target : Clock;

  if (editing) {
    return (
      <div className="border border-[var(--color-accent-rule)] bg-[var(--color-bg-card)] rounded-xl p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent-rule)]" />
          <h4 className="font-display text-sm font-semibold tracking-tight">
            Edit workout
          </h4>
        </div>
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                Title
              </label>
              <input
                className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                Format
              </label>
              <div className="flex gap-1.5 p-1 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)]">
                {(["time", "amrap"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setForm({ ...form, format: f })}
                    className={`flex-1 h-7 px-2 rounded text-[11px] font-medium uppercase tracking-wide transition-colors ${
                      form.format === f
                        ? "bg-[var(--color-bg-card)] text-[var(--color-ink)] shadow-sm"
                        : "text-[var(--color-ink-soft)]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
              Description
            </label>
            <textarea
              className="rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <ClassScopePicker
            classes={dayClasses}
            selectedClassIds={selectedClassIds}
            toggleClass={toggleClass}
          />
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => {
                setForm({
                  title: workout.title,
                  description: workout.description || "",
                  format: workout.format,
                  sort_order: workout.sort_order || 0,
                });
                setSelectedClassIds(initialClassIds);
                setEditing(false);
              }}
              className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={saving || !form.title.trim() || dayClasses.length === 0 || selectedClassIds.length === 0}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 p-3.5 bg-[var(--color-bg-card)] border border-[var(--color-rule)] rounded-lg hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-soft)] transition-all">
      <div className="shrink-0 flex flex-col items-center gap-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-bg-sunken)] text-[10.5px] font-semibold tabular-nums text-[var(--color-ink-soft)] border border-[var(--color-rule)]">
          {order}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded bg-[var(--color-bg-soft)] border border-[var(--color-rule)] text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">
            <FormatIcon size={10} strokeWidth={2} />
            {workout.format}
          </span>
          <h4 className="font-display text-[14.5px] font-semibold tracking-tight leading-tight truncate">
            {workout.title}
          </h4>
        </div>
        {workout.description && (
          <p className="text-[12.5px] text-[var(--color-ink-soft)] mt-1 leading-snug line-clamp-2">
            {workout.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-ink-muted)]">
            <LayoutGrid size={10} strokeWidth={1.75} />
            <span className="truncate">{appliesToLabel}</span>
          </span>
          <Link
            href={`/gym/${gymId}/workouts/${workout.id}`}
            className="text-[11px] font-medium text-[var(--color-accent-ink)] hover:underline no-underline"
          >
            View results →
          </Link>
        </div>
      </div>
      <div className="shrink-0 flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit workout"
          className="h-8 w-8 rounded-md border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] flex items-center justify-center transition-colors"
        >
          <Pencil size={12} strokeWidth={1.75} />
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete workout"
          className="h-8 w-8 rounded-md border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-colors"
        >
          <Trash2 size={12} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

function AddWorkoutForm({
  programId,
  date,
  nextOrder,
  classes,
  onCreated,
}: {
  programId: string;
  date: string;
  nextOrder: number;
  classes: any[];
  onCreated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    format: "time",
    sort_order: nextOrder,
  });
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const dayClasses = useMemo(() => classesForDateIso(date, classes), [date, classes]);

  function toggleClass(classId: string) {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    );
  }

  function resetForm() {
    setForm({ title: "", description: "", format: "time", sort_order: nextOrder + 1 });
    setSelectedClassIds([]);
  }

  async function handleCreate() {
    if (!form.title.trim() || selectedClassIds.length === 0) return;
    setSaving(true);
    try {
      await apiFetch(`/programs/${programId}/workouts`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          description: form.description || null,
          date,
          class_ids: selectedClassIds,
        }),
      });
      resetForm();
      setExpanded(false);
      onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="inline-flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] text-[12.5px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors"
      >
        <Plus size={13} strokeWidth={1.75} />
        Add workout
      </button>
    );
  }

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-rule)] rounded-xl p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent-rule)]" />
        <h4 className="font-display text-sm font-semibold tracking-tight">
          New workout
        </h4>
      </div>
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-[1fr_8rem] gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
              Title
            </label>
            <input
              autoFocus
              className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              placeholder="e.g. Back Squat 5×5"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
              Format
            </label>
            <div className="flex gap-1.5 p-1 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)]">
              {(["time", "amrap"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForm({ ...form, format: f })}
                  className={`flex-1 h-7 px-2 rounded text-[11px] font-medium uppercase tracking-wide transition-colors ${
                    form.format === f
                      ? "bg-[var(--color-bg-card)] text-[var(--color-ink)] shadow-sm"
                      : "text-[var(--color-ink-soft)]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
            Description <span className="normal-case tracking-normal text-[var(--color-ink-muted)]">(optional)</span>
          </label>
          <textarea
            className="rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
            placeholder="Workout details, reps, weights…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
        </div>
        <ClassScopePicker
          classes={dayClasses}
          selectedClassIds={selectedClassIds}
          toggleClass={toggleClass}
        />
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={() => {
              resetForm();
              setExpanded(false);
            }}
            className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !form.title.trim() || dayClasses.length === 0}
            className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
          >
            {saving ? "Adding…" : "Add workout"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// CLASS MODAL (Recurring / One-off tabs)
// =============================================

type ClassModalProps = {
  gymId: string;
  programId: string;
  coaches: any[];
  initial: any | null;
  onClose: () => void;
  onSaved: () => void;
};

function ClassModal({ gymId, programId, coaches, initial, onClose, onSaved }: ClassModalProps) {
  const isEdit = !!initial?.id;
  const initialTab: "recurring" | "one-off" = initial?.one_off_date ? "one-off" : "recurring";
  const [activeTab, setActiveTab] = useState<"recurring" | "one-off">(initialTab);
  const [name, setName] = useState<string>(initial?.name || "");
  const [description, setDescription] = useState<string>(initial?.description || "");
  const [startTime, setStartTime] = useState<string>(
    initial?.start_time
      ? utcHHMMSSToLocalHHMM(initial.start_time, initial.one_off_date || undefined)
      : "",
  );
  const [durationMinutes, setDurationMinutes] = useState<string>(
    initial?.duration_minutes != null ? String(initial.duration_minutes) : "60",
  );
  const [coachId, setCoachId] = useState<string>(initial?.coach_id || "");
  const [capacity, setCapacity] = useState<string>(
    initial?.capacity != null ? String(initial.capacity) : "",
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial?.days_of_week || []);
  const [oneOffDate, setOneOffDate] = useState<string>(initial?.one_off_date || "");
  const [planIds, setPlanIds] = useState<string[]>(initial?.plan_ids || []);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the plans available for this program. If the class has no plan
  // restrictions, signup is open to any active member of the gym.
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/programs/${programId}/plans`);
        setAvailablePlans(data || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [programId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Class name is required");
      return;
    }
    if (activeTab === "recurring" && daysOfWeek.length === 0) {
      setError("Select at least one day for a recurring class");
      return;
    }
    if (activeTab === "one-off" && !oneOffDate) {
      setError("Pick a date for a one-off class");
      return;
    }

    const body: any = {
      name: name.trim(),
      description: description.trim() || null,
      start_time: startTime
        ? localHHMMToUtcHHMMSS(
            startTime,
            activeTab === "one-off" ? oneOffDate || undefined : undefined,
          )
        : null,
      duration_minutes: parseInt(durationMinutes) || 60,
      coach_id: coachId || null,
      capacity: capacity ? parseInt(capacity) : null,
      days_of_week: activeTab === "recurring" ? daysOfWeek : [],
      one_off_date: activeTab === "one-off" ? oneOffDate : null,
      plan_ids: planIds,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await apiFetch(`/gyms/${gymId}/classes/${initial.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch(`/gyms/${gymId}/programs/${programId}/classes`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Failed to save class");
    } finally {
      setSaving(false);
    }
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const dayLabelsFull = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(10,10,10,0.45)] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="class-modal-title"
    >
      <div
        className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-2xl shadow-[var(--shadow-lifted)] border border-[var(--color-rule)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-[var(--color-rule)]">
          <div>
            <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-accent)] font-medium mb-1">
              {isEdit ? "Edit class" : "New class"}
            </div>
            <h3
              id="class-modal-title"
              className="font-display text-2xl font-semibold tracking-tight leading-tight"
            >
              {isEdit ? "Update class details" : "Schedule a class"}
            </h3>
            <p className="text-[13px] text-[var(--color-ink-soft)] mt-1">
              Configure timing, coach, capacity, and access.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-md border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] flex items-center justify-center transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Schedule type segmented toggle */}
        <div className="px-6 pt-5">
          <div className="text-[10.5px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] font-medium mb-2">
            Schedule type
          </div>
          <div className="inline-flex rounded-md border border-[var(--color-rule-strong)] p-0.5 bg-[var(--color-bg-sunken)]">
            {(["recurring", "one-off"] as const).map((tab) => {
              const active = activeTab === tab;
              const Icon = tab === "recurring" ? Repeat : CalendarDays;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`h-8 px-3.5 rounded text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                    active
                      ? "bg-[var(--color-bg-card)] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
                      : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  <Icon size={13} />
                  {tab === "recurring" ? "Recurring" : "One-off"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <div className="px-6 pt-5 pb-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cm-name" className="text-sm font-medium">
              Class name
            </label>
            <input
              id="cm-name"
              autoFocus
              className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              placeholder="e.g. Morning CrossFit"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cm-desc" className="text-sm font-medium">
              Description{" "}
              <span className="text-[var(--color-ink-muted)] font-normal">(optional)</span>
            </label>
            <textarea
              id="cm-desc"
              className="rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short note about the class (optional)"
            />
          </div>

          {activeTab === "recurring" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Days of week</label>
              <div className="flex gap-1.5 flex-wrap">
                {dayLabels.map((label, idx) => {
                  const selected = daysOfWeek.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      title={dayLabelsFull[idx]}
                      className={`h-9 w-9 rounded-md text-[13px] font-medium border transition-colors ${
                        selected
                          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                          : "border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cm-date" className="text-sm font-medium">
                Date
              </label>
              <input
                id="cm-date"
                type="date"
                value={oneOffDate}
                onChange={(e) => setOneOffDate(e.target.value)}
                className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              />
            </div>
          )}

          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cm-start" className="text-sm font-medium">
                Start time{" "}
                <span className="text-[var(--color-ink-muted)] font-normal">
                  (your local time)
                </span>
              </label>
              <div className="flex gap-2 items-center">
                <input
                  id="cm-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-10 flex-1 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                />
                {startTime && (
                  <button
                    type="button"
                    onClick={() => setStartTime("")}
                    className="h-10 px-2.5 rounded-md text-xs text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
                    title="Clear start time"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cm-dur" className="text-sm font-medium">
                Duration
              </label>
              <div className="relative">
                <input
                  id="cm-dur"
                  inputMode="numeric"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 pr-9 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-muted)]">
                  min
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cm-coach" className="text-sm font-medium">
                Coach{" "}
                <span className="text-[var(--color-ink-muted)] font-normal">(optional)</span>
              </label>
              <select
                id="cm-coach"
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
                className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              >
                <option value="">No coach assigned</option>
                {coaches.map((c) => (
                  <option key={c.user_id || c.id} value={c.user_id || c.id}>
                    {c.profile?.first_name || c.first_name}{" "}
                    {c.profile?.last_name || c.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cm-cap" className="text-sm font-medium">
                Capacity
              </label>
              <input
                id="cm-cap"
                inputMode="numeric"
                placeholder="—"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              />
            </div>
          </div>

          {/* Plan restrictions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Allowed memberships{" "}
              <span className="text-[var(--color-ink-muted)] font-normal">
                (none = open to any active member)
              </span>
            </label>
            {availablePlans.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--color-rule-strong)] bg-[var(--color-bg-sunken)] px-3 py-3 text-xs text-[var(--color-ink-muted)]">
                This program has no membership plans yet. Add plans in the Plans tab to
                restrict who can sign up.
              </div>
            ) : (
              <div className="flex flex-col gap-1 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-sunken)] p-1.5">
                {availablePlans.map((plan) => {
                  const checked = planIds.includes(plan.id);
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        setPlanIds((prev) =>
                          checked
                            ? prev.filter((id) => id !== plan.id)
                            : [...prev, plan.id],
                        );
                      }}
                      className={`flex items-center gap-3 rounded px-2.5 py-2 text-left text-sm transition-colors ${
                        checked
                          ? "bg-[var(--color-bg-card)] border border-[var(--color-ink)] shadow-[var(--shadow-soft)]"
                          : "border border-transparent hover:bg-[var(--color-bg-card)]"
                      }`}
                    >
                      <span
                        className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          checked
                            ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                            : "border-[var(--color-rule-strong)] bg-[var(--color-bg-card)]"
                        }`}
                      >
                        {checked && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="flex-1 font-medium text-[var(--color-ink)]">
                        {plan.name}
                      </span>
                      <span className="text-xs tabular-nums text-[var(--color-ink-muted)]">
                        ${(plan.price_cents / 100).toFixed(2)}
                        <span className="mx-1.5 text-[var(--color-rule-strong)]">·</span>
                        {plan.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-rule)] mt-2">
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add class"}
          </button>
        </div>
      </div>
    </div>
  );
}
