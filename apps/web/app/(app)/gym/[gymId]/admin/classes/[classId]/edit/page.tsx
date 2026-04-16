"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { formatUtcTime, localHHMMToUtcHHMMSS } from "@/lib/utils";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function EditClassSchedulePage() {
  const { classId } = useParams();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, [classId]);

  async function loadSchedules() {
    if (!classId) return;
    try {
      const data = await apiFetch(`/classes/${classId}/schedules`);
      setSchedules(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/classes/${classId}/schedules`, {
        method: "POST",
        body: JSON.stringify({
          day_of_week: dayOfWeek,
          start_time: localHHMMToUtcHHMMSS(startTime),
        }),
      });
      loadSchedules();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(scheduleId: string) {
    try {
      await apiFetch(`/class-schedules/${scheduleId}`, { method: "DELETE" });
      loadSchedules();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <p className="text-[13px] text-[var(--color-ink-soft)]">Loading…</p>;

  return (
    <div className="max-w-lg">
      <BackButton className="mb-4" />

      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight text-[var(--color-ink)]">
          Class Schedule
        </h1>
        <p className="text-[13px] text-[var(--color-ink-soft)] mt-1">
          Manage the recurring weekly schedule for this class.
        </p>
      </header>

      <div className="mb-5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-5">
        <h3 className="text-[13px] font-semibold text-[var(--color-ink)] mb-3">Add Schedule</h3>
        <form onSubmit={handleAdd} className="flex gap-3 items-end">
          <div className="flex flex-col flex-1 gap-1.5">
            <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Day</label>
            <select
              value={String(dayOfWeek)}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
              className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
            >
              {DAY_NAMES.map((name, idx) => (
                <option key={idx} value={String(idx)}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col flex-1 gap-1.5">
            <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
          >
            Add
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-2">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="border border-[var(--color-rule)] rounded-lg bg-[var(--color-bg-card)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[var(--color-ink)]">
                {DAY_NAMES[schedule.day_of_week]} at {formatUtcTime(schedule.start_time)}
              </span>
              <button
                onClick={() => handleRemove(schedule.id)}
                className="h-7 px-2.5 rounded-md text-[12px] font-medium text-[var(--color-ink-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <p className="text-center text-[13px] text-[var(--color-ink-muted)] py-8">No recurring schedule set.</p>
        )}
      </div>
    </div>
  );
}
