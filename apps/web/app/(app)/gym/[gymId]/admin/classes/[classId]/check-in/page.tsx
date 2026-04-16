"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { formatUtcTime } from "@/lib/utils";

export default function CheckInPage() {
  const { gymId, classId } = useParams();
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gymId) loadOccurrences();
  }, [gymId]);

  async function loadOccurrences() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const end = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      const data = await apiFetch(`/gyms/${gymId}/occurrences?start=${today}&end=${end}`);
      const filtered = (data || []).filter((o: any) => o.class_id === classId);
      setOccurrences(filtered);
      if (filtered.length > 0) setSelectedOccurrence(filtered[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn(signupId: string) {
    if (!selectedOccurrence) return;
    try {
      await apiFetch(`/occurrences/${selectedOccurrence.id}/check-in/${signupId}`, {
        method: "POST",
      });
      loadOccurrences();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <p className="text-[13px] text-[var(--color-ink-soft)]">Loading…</p>;

  return (
    <div className="max-w-lg">
      <BackButton className="mb-4" />

      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight text-[var(--color-ink)]">
          Check-in
        </h1>
        <p className="text-[13px] text-[var(--color-ink-soft)] mt-1">
          Mark attendance for upcoming class sessions.
        </p>
      </header>

      {occurrences.length === 0 ? (
        <p className="text-center text-[13px] text-[var(--color-ink-muted)] py-8">No upcoming occurrences for this class.</p>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Select Session</label>
            <select
              value={selectedOccurrence?.id || ""}
              onChange={(e) =>
                setSelectedOccurrence(occurrences.find((o) => o.id === e.target.value))
              }
              className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
            >
              {occurrences.map((occ) => (
                <option key={occ.id} value={occ.id}>
                  {new Date(occ.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at {formatUtcTime(occ.start_time, occ.date)}
                </option>
              ))}
            </select>
          </div>

          {selectedOccurrence && (
            <div className="border border-[var(--color-rule)] rounded-xl bg-[var(--color-bg-card)] p-5">
              <h3 className="text-[13px] font-semibold text-[var(--color-ink)] mb-3">
                Signups ({selectedOccurrence.signups?.length || 0})
              </h3>
              {selectedOccurrence.signups?.length === 0 ? (
                <p className="text-center text-[13px] text-[var(--color-ink-muted)] py-8">No signups yet.</p>
              ) : (
                <div>
                  {selectedOccurrence.signups?.map((signup: any, index: number) => (
                    <div key={signup.id}>
                      {index > 0 && <div className="border-t border-[var(--color-rule)] my-2" />}
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-bg-soft)] ring-1 ring-[var(--color-rule)] flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-[var(--color-ink-soft)]">
                              {signup.profile?.first_name?.[0]}
                              {signup.profile?.last_name?.[0]}
                            </span>
                          </div>
                          <span className="text-[13px] font-medium text-[var(--color-ink)]">
                            {signup.profile?.first_name} {signup.profile?.last_name}
                          </span>
                        </div>
                        {signup.checked_in ? (
                          <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] text-[11px] font-medium border border-[var(--color-accent-rule)]">
                            Checked In
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCheckIn(signup.id)}
                            className="h-8 px-3 rounded-md bg-[var(--color-accent)] text-white text-[12px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors"
                          >
                            Check In
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
