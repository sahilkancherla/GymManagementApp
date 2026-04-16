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

// Format a UTC HH:MM:SS time as the user's local clock time.
// Pass `date` (YYYY-MM-DD) when the time is tied to a specific day so DST is
// applied correctly; otherwise today's date is used as a reference.
export function formatUtcTime(
  hhmmss: string | null | undefined,
  date?: string,
): string {
  if (!hhmmss) return "";
  return formatLocal(utcTimeToLocalDate(date || todayIsoLocal(), hhmmss));
}

// Format a UTC HH:MM:SS plus an offset in minutes as local clock time.
export function formatUtcTimePlusMinutes(
  hhmmss: string | null | undefined,
  minutes: number,
  date?: string,
): string {
  if (!hhmmss) return "";
  const d = utcTimeToLocalDate(date || todayIsoLocal(), hhmmss);
  d.setMinutes(d.getMinutes() + (minutes || 0));
  return formatLocal(d);
}

// Convert a UTC HH:MM:SS to a local HH:MM string suitable for
// `<input type="time">`. Uses today's date as a reference for DST.
export function utcHHMMSSToLocalHHMM(
  hhmmss: string | null | undefined,
  date?: string,
): string {
  if (!hhmmss) return "";
  const d = utcTimeToLocalDate(date || todayIsoLocal(), hhmmss);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Convert a local HH:MM (from `<input type="time">`) to a UTC HH:MM:SS.
// `date` should be the date the time will apply on (when known) so DST is
// handled correctly.
export function localHHMMToUtcHHMMSS(
  hhmm: string,
  date?: string,
): string {
  if (!hhmm) return hhmm;
  const [hStr, mStr] = hhmm.split(":");
  const ref = date || todayIsoLocal();
  const [yyyy, mm, dd] = ref.split("-").map((p) => parseInt(p, 10));
  const local = new Date(
    yyyy,
    (mm || 1) - 1,
    dd || 1,
    parseInt(hStr || "0", 10),
    parseInt(mStr || "0", 10),
    0,
  );
  return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(
    local.getUTCSeconds(),
  )}`;
}

// Returns true if the class occurrence is in the past (start + duration has elapsed).
// Returns false when start_time is missing (no end reference).
export function isClassCompleted(
  date: string | null | undefined,
  hhmmss: string | null | undefined,
  durationMinutes: number | null | undefined,
): boolean {
  if (!date || !hhmmss) return false;
  const end = utcTimeToLocalDate(date, hhmmss);
  end.setMinutes(end.getMinutes() + (durationMinutes || 0));
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
