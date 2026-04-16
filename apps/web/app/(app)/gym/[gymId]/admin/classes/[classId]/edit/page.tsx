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

  if (loading) return <p className="text-gray-600">Loading...</p>;

  return (
    <div className="max-w-lg">
      <BackButton className="mb-3" />
      <h1 className="text-3xl font-bold mb-4">Class Schedule</h1>

      <div className="mb-4 p-4 border border-gray-200 rounded-xl">
        <h3 className="text-lg font-semibold mb-3">Add Schedule</h3>
        <form onSubmit={handleAdd} className="flex gap-3 items-end">
          <div className="flex flex-col flex-1 gap-1">
            <label className="text-sm font-medium">Day</label>
            <select
              value={String(dayOfWeek)}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
              className="h-10 rounded-md border border-gray-300 px-3 text-sm bg-white"
            >
              {DAY_NAMES.map((name, idx) => (
                <option key={idx} value={String(idx)}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col flex-1 gap-1">
            <label className="text-sm font-medium">Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-10 rounded-md border border-gray-300 px-3 text-sm bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
          >
            Add
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-2">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {DAY_NAMES[schedule.day_of_week]} at {formatUtcTime(schedule.start_time)}
              </span>
              <button
                onClick={() => handleRemove(schedule.id)}
                className="h-8 px-2 rounded text-sm text-gray-700 hover:bg-gray-100"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <p className="text-center text-gray-600 py-6">No recurring schedule set.</p>
        )}
      </div>
    </div>
  );
}
