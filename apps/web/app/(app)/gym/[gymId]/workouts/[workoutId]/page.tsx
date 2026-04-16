"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Gender = "male" | "female" | "other" | "prefer_not_to_say" | null;

type LeaderboardStat = {
  id: string;
  user_id: string;
  workout_id: string;
  time_seconds: number | null;
  amrap_rounds: number | null;
  amrap_reps: number | null;
  notes: string | null;
  rank: number | null;
  gender_rank: number | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    gender: Gender;
  } | null;
};

type LeaderboardResponse = {
  workout: {
    id: string;
    title: string;
    description: string | null;
    format: "time" | "amrap" | string;
    date: string;
    program: { id: string; name: string; gym_id: string } | null;
  };
  stats: LeaderboardStat[];
  overall_total: number;
  gender_totals: Record<string, number>;
};

type Filter = "all" | "male" | "female";

export default function WorkoutLeaderboardPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const gymId = params?.gymId as string;
  const workoutId = params?.workoutId as string;
  const focusUserId = search?.get("userId") || null;

  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/workouts/${workoutId}/leaderboard`);
        setData(res);
      } catch (err: any) {
        setError(err?.message || "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [workoutId]);

  const focusStat = useMemo(
    () => data?.stats.find((s) => s.user_id === focusUserId) || null,
    [data, focusUserId],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.stats;
    return data.stats.filter((s) => s.profile?.gender === filter);
  }, [data, filter]);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <p className="text-[13px] text-[var(--color-ink-muted)]">
          Loading leaderboard…
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <p className="text-[13px] text-red-600">
          {error || "Workout not found"}
        </p>
      </div>
    );
  }

  const w = data.workout;
  const dateStr = w.date
    ? new Date(w.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={1.8} />
        Back
      </button>

      {/* Workout header */}
      <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-6">
        <div className="flex items-center gap-2 mb-2">
          <FormatBadge format={w.format} />
          {w.program && (
            <span className="text-[11.5px] text-[var(--color-ink-muted)] uppercase tracking-wide font-medium">
              {w.program.name}
            </span>
          )}
        </div>
        <h1 className="text-[22px] font-semibold text-[var(--color-ink)] mb-1">
          {w.title}
        </h1>
        <div className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-ink-muted)]">
          <CalendarDays size={13} strokeWidth={1.8} />
          {dateStr}
        </div>
        {w.description && (
          <p className="mt-4 text-[13px] text-[var(--color-ink-soft)] whitespace-pre-wrap">
            {w.description}
          </p>
        )}
      </div>

      {/* Focus user summary */}
      {focusStat && (
        <div className="rounded-xl border border-[var(--color-accent-rule)] bg-[var(--color-accent-soft)] p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-accent-ink)] mb-2">
            This member's result
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="text-[12px] text-[var(--color-ink-muted)] mb-0.5">
                Name
              </div>
              <div className="text-[15px] font-semibold text-[var(--color-ink)]">
                {fullName(focusStat)}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--color-ink-muted)] mb-0.5">
                Result
              </div>
              <div className="text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">
                {formatResult(focusStat, w.format)}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--color-ink-muted)] mb-0.5">
                Overall rank
              </div>
              <div className="text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">
                {focusStat.rank != null
                  ? `#${focusStat.rank} / ${data.overall_total}`
                  : "—"}
              </div>
            </div>
            {focusStat.profile?.gender &&
              (focusStat.profile.gender === "male" ||
                focusStat.profile.gender === "female") && (
                <div>
                  <div className="text-[12px] text-[var(--color-ink-muted)] mb-0.5">
                    {focusStat.profile.gender === "male" ? "Men" : "Women"} rank
                  </div>
                  <div className="text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">
                    {focusStat.gender_rank != null
                      ? `#${focusStat.gender_rank} / ${
                          data.gender_totals[focusStat.profile.gender] || 0
                        }`
                      : "—"}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-rule)]">
          <div className="flex items-center gap-2">
            <Trophy
              size={15}
              strokeWidth={1.8}
              className="text-[var(--color-accent-ink)]"
            />
            <h2 className="text-[14.5px] font-semibold text-[var(--color-ink)]">
              Leaderboard
            </h2>
            <span className="text-[11.5px] text-[var(--color-ink-muted)]">
              {data.overall_total} {data.overall_total === 1 ? "result" : "results"}
            </span>
          </div>
          <FilterToggle filter={filter} onChange={setFilter} totals={data.gender_totals} />
        </div>

        {filtered.length === 0 ? (
          <p className="text-[13px] text-[var(--color-ink-muted)] py-10 text-center">
            No results{filter !== "all" ? ` for ${filter}` : ""} yet.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--color-bg-sunken)] border-b border-[var(--color-rule)]">
                <th className="text-left px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)] w-20">
                  Rank
                </th>
                <th className="text-left px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Name
                </th>
                <th className="text-left px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Result
                </th>
                <th className="text-left px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const isFocus = focusUserId && s.user_id === focusUserId;
                const rank = filter === "all" ? s.rank : s.gender_rank;
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-[var(--color-rule)] last:border-b-0 ${
                      isFocus ? "bg-[var(--color-accent-soft)]" : ""
                    }`}
                  >
                    <td className="px-5 py-3 align-top">
                      <RankBadge rank={rank} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-[13px] font-medium text-[var(--color-ink)]">
                        {fullName(s)}
                      </div>
                      {s.profile?.gender &&
                        (s.profile.gender === "male" ||
                          s.profile.gender === "female") && (
                          <div className="text-[10.5px] uppercase tracking-wide text-[var(--color-ink-muted)] mt-0.5">
                            {s.profile.gender}
                          </div>
                        )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold tabular-nums text-[var(--color-ink)]">
                          {formatResult(s, w.format)}
                        </span>
                        {(s as any).rx_scaled && (
                          <span
                            className={`inline-flex items-center h-4 px-1.5 rounded text-[9.5px] font-semibold uppercase ${
                              (s as any).rx_scaled === "rx"
                                ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"
                                : "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)]"
                            }`}
                          >
                            {(s as any).rx_scaled === "rx" ? "Rx" : "Scaled"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 align-top">
                      <span className="text-[12px] text-[var(--color-ink-soft)]">
                        {s.notes?.trim() || (
                          <span className="text-[var(--color-ink-muted)]">—</span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FilterToggle({
  filter,
  onChange,
  totals,
}: {
  filter: Filter;
  onChange: (f: Filter) => void;
  totals: Record<string, number>;
}) {
  const options: Array<{ value: Filter; label: string; count?: number }> = [
    { value: "all", label: "All" },
    { value: "male", label: "Men", count: totals.male || 0 },
    { value: "female", label: "Women", count: totals.female || 0 },
  ];
  return (
    <div className="inline-flex items-center rounded-md border border-[var(--color-rule)] bg-white p-0.5">
      {options.map((o) => {
        const active = filter === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`h-7 px-3 rounded text-[12px] font-medium transition-colors ${
              active
                ? "bg-[var(--color-ink)] text-white"
                : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
            }`}
          >
            {o.label}
            {o.count != null && (
              <span
                className={`ml-1.5 tabular-nums ${
                  active ? "opacity-70" : "text-[var(--color-ink-muted)]"
                }`}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank == null) {
    return <span className="text-[13px] text-[var(--color-ink-muted)]">—</span>;
  }
  const tone =
    rank === 1
      ? "bg-[var(--color-accent-ink)] text-white"
      : rank <= 3
        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border border-[var(--color-accent-rule)]"
        : "bg-[var(--color-bg-sunken)] text-[var(--color-ink-soft)] border border-[var(--color-rule)]";
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-md text-[12.5px] font-semibold tabular-nums ${tone}`}
    >
      #{rank}
    </span>
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

function fullName(s: LeaderboardStat): string {
  const parts = [s.profile?.first_name, s.profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return parts || "Member";
}

function formatResult(s: LeaderboardStat, format: string): string {
  if (format === "time") {
    if (s.time_seconds == null) return "—";
    const m = Math.floor(s.time_seconds / 60);
    const sec = s.time_seconds % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }
  if (format === "amrap") {
    if (s.amrap_rounds == null) return "—";
    const reps = s.amrap_reps ?? 0;
    return reps > 0 ? `${s.amrap_rounds} + ${reps}` : `${s.amrap_rounds}`;
  }
  return "—";
}
