"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { formatUtcTime } from "@/lib/utils";

export default function ClassesPage() {
  const { gymId } = useParams();
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gymId) loadOccurrences();
  }, [gymId]);

  async function loadOccurrences() {
    try {
      const today = new Date();
      const start = today.toISOString().split("T")[0];
      const end = new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0];
      const data = await apiFetch(`/gyms/${gymId}/occurrences?start=${start}&end=${end}`);
      setOccurrences((data || []).filter((o: any) => o.class));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(occurrenceId: string) {
    try {
      await apiFetch(`/occurrences/${occurrenceId}/signup`, { method: "POST" });
      loadOccurrences();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleCancelSignup(occurrenceId: string) {
    try {
      await apiFetch(`/occurrences/${occurrenceId}/signup`, { method: "DELETE" });
      loadOccurrences();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <p className="text-[var(--color-ink-soft)]">Loading...</p>;

  const grouped = occurrences.reduce((acc: Record<string, any[]>, occ) => {
    const date = occ.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(occ);
    return acc;
  }, {});

  return (
    <div>
      <BackButton href={`/gym/${gymId}`} label="Gym" className="mb-3" />
      <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight text-[var(--color-ink)] mb-5">Class Schedule</h1>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-[var(--color-ink-soft)] text-center py-10">No classes scheduled this week.</p>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, occs]) => (
            <div key={date} className="mb-5">
              <h2 className="text-sm text-[var(--color-ink-soft)] mb-3">
                {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </h2>
              <div className="flex flex-col gap-2">
                {(occs as any[])
                  .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
                  .map((occ) => (
                  <div
                    key={occ.id}
                    className={`border border-[var(--color-rule)] rounded-xl p-4 ${occ.is_cancelled ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold">{occ.class?.name}</h3>
                          {occ.is_cancelled && (
                            <span className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold">
                              Cancelled
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--color-ink-soft)]">
                          {formatUtcTime(occ.start_time, occ.date)} · {occ.class?.duration_minutes}min
                          {occ.coach && ` · ${occ.coach.first_name} ${occ.coach.last_name}`}
                        </p>
                        <span className="inline-block mt-1 px-2 py-1 rounded bg-[var(--color-bg-soft)] text-xs">
                          {occ.signups?.length || 0}
                          {occ.class?.capacity ? ` / ${occ.class.capacity}` : ""} signed up
                        </span>
                      </div>
                      {!occ.is_cancelled && (
                        <div>
                          {occ.signups?.some((s: any) => s.user_id) ? (
                            <button
                              onClick={() => handleCancelSignup(occ.id)}
                              className="h-9 px-3 rounded-md text-sm text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSignup(occ.id)}
                              className="h-9 px-3 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)]"
                            >
                              Sign Up
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
