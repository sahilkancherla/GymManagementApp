// Utility functions for the web app.
//
// Time-handling convention:
//   - The backend stores `start_time` as a UTC `time` (HH:MM:SS) value.
//     Class occurrences pair it with a `date` for an absolute UTC instant.
//   - The frontend always converts those UTC times into the user's local
//     timezone for display, and converts local times entered through
//     `<input type="time">` back into UTC before sending to the API.

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Build a JS Date for a UTC HH:MM(:SS) value anchored to an ISO date.
export function utcTimeToLocalDate(date: string, hhmmss: string): Date {
  const parts = hhmmss.split(":");
  const time = `${pad(parseInt(parts[0] || "0", 10))}:${pad(
    parseInt(parts[1] || "0", 10),
  )}:${pad(parseInt(parts[2] || "0", 10))}`;
  return new Date(`${date}T${time}Z`);
}

function formatLocal(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${pad(m)} ${suffix}`;
}

// Format a HH:MM:SS time string for display (e.g. "9:00 AM").
// Times are stored as local time, so no UTC conversion needed.
export function formatUtcTime(
  hhmmss: string | null | undefined,
  _date?: string,
): string {
  if (!hhmmss) return "";
  const parts = hhmmss.split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${pad(m)} ${suffix}`;
}

// Format a HH:MM:SS plus an offset in minutes for display.
export function formatUtcTimePlusMinutes(
  hhmmss: string | null | undefined,
  minutes: number,
  _date?: string,
): string {
  if (!hhmmss) return "";
  const parts = hhmmss.split(":");
  let h = parseInt(parts[0] || "0", 10);
  let m = parseInt(parts[1] || "0", 10);
  m += minutes || 0;
  h += Math.floor(m / 60);
  m = m % 60;
  h = h % 24;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${pad(m)} ${suffix}`;
}

// Convert a HH:MM:SS to HH:MM string suitable for `<input type="time">`.
// Times are stored as local time so no conversion needed.
export function utcHHMMSSToLocalHHMM(
  hhmmss: string | null | undefined,
  _date?: string,
): string {
  if (!hhmmss) return "";
  const parts = hhmmss.split(":");
  return `${pad(parseInt(parts[0] || "0", 10))}:${pad(parseInt(parts[1] || "0", 10))}`;
}

// Convert a local HH:MM (from `<input type="time">`) to HH:MM:SS for storage.
// Times are stored as local time (not converted to UTC) because schedule times
// represent "this class is at 9 AM" in the gym's local timezone, not an
// absolute UTC instant. Converting to UTC breaks day boundaries.
export function localHHMMToUtcHHMMSS(
  hhmm: string,
  _date?: string,
): string {
  if (!hhmm) return hhmm;
  const [hStr, mStr] = hhmm.split(":");
  return `${pad(parseInt(hStr || "0", 10))}:${pad(parseInt(mStr || "0", 10))}:00`;
}

// Returns true if the class occurrence is in the past (start + duration has elapsed).
// Returns false when start_time is missing (no end reference).
// Times are stored as local time, so we build a local Date directly.
export function isClassCompleted(
  date: string | null | undefined,
  hhmmss: string | null | undefined,
  durationMinutes: number | null | undefined,
): boolean {
  if (!date || !hhmmss) return false;
  const parts = hhmmss.split(":");
  const [yyyy, mm, dd] = date.split("-").map((p) => parseInt(p, 10));
  const end = new Date(
    yyyy,
    (mm || 1) - 1,
    dd || 1,
    parseInt(parts[0] || "0", 10),
    parseInt(parts[1] || "0", 10) + (durationMinutes || 0),
    0,
  );
  return end.getTime() < Date.now();
}

// Best-effort short timezone abbreviation for the current locale (e.g. "PST").
export function localTimeZoneAbbr(): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}
