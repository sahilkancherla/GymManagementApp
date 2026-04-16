"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";

export default function ProgramDetailPage() {
  const { gymId, programId } = useParams();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [weekDates, setWeekDates] = useState<string[]>([]);

  useEffect(() => {
    const date = new Date(selectedDate);
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

  useEffect(() => {
    if (programId && weekDates.length === 7) {
      apiFetch(`/programs/${programId}/workouts?start=${weekDates[0]}&end=${weekDates[6]}`)
        .then(setWorkouts)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [programId, weekDates]);

  function navigateWeek(direction: number) {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + direction * 7);
    setSelectedDate(date.toISOString().split("T")[0]);
    setLoading(true);
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <BackButton href={`/gym/${gymId}?tab=programs`} label="Programs" className="mb-3" />
      <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight text-[var(--color-ink)] mb-5">Program Calendar</h1>

      <div className="flex items-center gap-4 mb-5">
        <button
          onClick={() => navigateWeek(-1)}
          className="h-9 px-3 rounded-md border border-[var(--color-rule-strong)] text-sm hover:bg-[var(--color-bg-soft)]"
        >
          ← Prev
        </button>
        <span className="text-sm font-medium">
          {weekDates[0] && new Date(weekDates[0] + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" - "}
          {weekDates[6] && new Date(weekDates[6] + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <button
          onClick={() => navigateWeek(1)}
          className="h-9 px-3 rounded-md border border-[var(--color-rule-strong)] text-sm hover:bg-[var(--color-bg-soft)]"
        >
          Next →
        </button>
      </div>

      {loading ? (
        <p className="text-[var(--color-ink-soft)]">Loading...</p>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, idx) => {
            const dayWorkouts = workouts
              .filter((w) => w.date === date)
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
            const isToday = date === new Date().toISOString().split("T")[0];
            return (
              <div
                key={date}
                className={`border rounded-lg p-3 min-h-32 ${
                  isToday ? "border-blue-500 border-2" : "border-[var(--color-rule)]"
                }`}
              >
                <div className="text-xs font-medium text-[var(--color-ink-muted)] mb-2">
                  {dayNames[idx]} {new Date(date + "T00:00:00").getDate()}
                </div>
                {dayWorkouts.length === 0 ? (
                  <p className="text-xs text-[var(--color-ink-muted)]">No workouts</p>
                ) : (
                  dayWorkouts.map((workout) => (
                    <WorkoutCard key={workout.id} workout={workout} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkoutCard({ workout }: { workout: any }) {
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [timeMinutes, setTimeMinutes] = useState("");
  const [timeSeconds, setTimeSeconds] = useState("");
  const [amrapRounds, setAmrapRounds] = useState("");
  const [amrapReps, setAmrapReps] = useState("");
  const [notes, setNotes] = useState("");
  const [rxScaled, setRxScaled] = useState<"rx" | "scaled" | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadStats() {
    try {
      const data = await apiFetch(`/workouts/${workout.id}/stats`);
      if (data && data.length > 0) {
        const s = data[0];
        setStats(s);
        if (s.time_seconds) {
          setTimeMinutes(String(Math.floor(s.time_seconds / 60)));
          setTimeSeconds(String(s.time_seconds % 60));
        }
        if (s.amrap_rounds !== null) setAmrapRounds(String(s.amrap_rounds));
        if (s.amrap_reps !== null) setAmrapReps(String(s.amrap_reps));
        if (s.notes) setNotes(s.notes);
        if (s.rx_scaled) setRxScaled(s.rx_scaled);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveStats() {
    setSaving(true);
    try {
      const body: any = { notes: notes || null, rx_scaled: rxScaled };
      if (workout.format === "time") {
        body.time_seconds = (parseInt(timeMinutes) || 0) * 60 + (parseInt(timeSeconds) || 0);
      } else {
        body.amrap_rounds = parseInt(amrapRounds) || 0;
        body.amrap_reps = parseInt(amrapReps) || 0;
      }
      await apiFetch(`/workouts/${workout.id}/stats`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setShowStats(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-2">
      <div
        className="cursor-pointer"
        onClick={() => {
          setShowStats(!showStats);
          if (!showStats && !stats) loadStats();
        }}
      >
        <p className="text-xs font-semibold">{workout.title}</p>
        <span className="inline-block mt-1 border border-[var(--color-rule)] px-1 py-px rounded text-[10px]">
          {workout.format}
        </span>
      </div>

      {showStats && (
        <div className="mt-2 p-2 bg-[var(--color-bg-soft)] rounded flex flex-col gap-2">
          {workout.format === "time" ? (
            <div className="flex gap-1 items-center">
              <input
                className="w-12 h-8 rounded border border-[var(--color-rule-strong)] px-1 text-xs"
                inputMode="numeric"
                placeholder="min"
                value={timeMinutes}
                onChange={(e) => setTimeMinutes(e.target.value)}
              />
              <span className="text-xs">:</span>
              <input
                className="w-12 h-8 rounded border border-[var(--color-rule-strong)] px-1 text-xs"
                inputMode="numeric"
                placeholder="sec"
                value={timeSeconds}
                onChange={(e) => setTimeSeconds(e.target.value)}
              />
            </div>
          ) : (
            <div className="flex gap-1 items-center">
              <input
                className="w-12 h-8 rounded border border-[var(--color-rule-strong)] px-1 text-xs"
                inputMode="numeric"
                placeholder="rds"
                value={amrapRounds}
                onChange={(e) => setAmrapRounds(e.target.value)}
              />
              <span className="text-xs">+</span>
              <input
                className="w-12 h-8 rounded border border-[var(--color-rule-strong)] px-1 text-xs"
                inputMode="numeric"
                placeholder="reps"
                value={amrapReps}
                onChange={(e) => setAmrapReps(e.target.value)}
              />
            </div>
          )}
          <div className="flex gap-1">
            {(["rx", "scaled"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setRxScaled(rxScaled === opt ? null : opt)}
                className={`h-7 px-3 rounded-full text-[11px] font-medium border transition-colors ${
                  rxScaled === opt
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-accent-rule)]"
                    : "bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] border-[var(--color-rule)] hover:text-[var(--color-ink)]"
                }`}
              >
                {opt === "rx" ? "Rx" : "Scaled"}
              </button>
            ))}
          </div>
          <input
            className="w-full h-8 rounded border border-[var(--color-rule-strong)] px-2 text-xs"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            onClick={handleSaveStats}
            disabled={saving}
            className="h-8 rounded bg-[var(--color-accent)] text-white text-xs font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-70"
          >
            {saving ? "..." : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
