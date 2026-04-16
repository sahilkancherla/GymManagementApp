"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatUtcTime,
  formatUtcTimePlusMinutes,
  isClassCompleted,
} from "@/lib/utils";

export type CalendarView = "day" | "week" | "month";

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISODate(iso: string) {
  return new Date(iso + "T00:00:00");
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function startOfWeek(d: Date) {
  return addDays(d, -d.getDay());
}

function classesForDate(iso: string, classes: any[]) {
  const d = fromISODate(iso);
  const dow = d.getDay();
  return classes
    .filter((cls) => {
      if (cls.one_off_date) return cls.one_off_date === iso;
      const days: number[] = cls.days_of_week || [];
      return days.includes(dow);
    })
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
}

export function ClassCalendar({
  classes,
  loading = false,
  groupByProgram = true,
  onClassClick,
}: {
  classes: any[];
  loading?: boolean;
  groupByProgram?: boolean;
  onClassClick?: (cls: any, iso: string) => void;
}) {
  const todayIso = toISODate(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<string>(todayIso);

  function navigate(direction: number) {
    if (view === "day") setAnchor(addDays(anchor, direction));
    else if (view === "week") setAnchor(addDays(anchor, direction * 7));
    else {
      const next = new Date(anchor);
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
      setAnchor(next);
    }
  }

  function goToday() {
    const now = new Date();
    setAnchor(now);
    setSelectedDay(toISODate(now));
  }

  const views: { key: CalendarView; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
  ];

  const title = (() => {
    if (view === "day") {
      return anchor.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (view === "week") {
      const s = startOfWeek(anchor);
      const e = addDays(s, 6);
      const sameMonth = s.getMonth() === e.getMonth();
      const sOpts: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
      };
      const eOpts: Intl.DateTimeFormatOptions = sameMonth
        ? { day: "numeric", year: "numeric" }
        : { month: "short", day: "numeric", year: "numeric" };
      return `${s.toLocaleDateString("en-US", sOpts)} — ${e.toLocaleDateString(
        "en-US",
        eOpts,
      )}`;
    }
    return anchor.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  })();

  return (
    <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--color-rule)] flex-wrap">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
            <button
              onClick={() => navigate(-1)}
              className="h-8 w-8 flex items-center justify-center text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft size={14} strokeWidth={1.9} />
            </button>
            <span className="w-px h-5 bg-[var(--color-rule)]" />
            <button
              onClick={() => navigate(1)}
              className="h-8 w-8 flex items-center justify-center text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors"
              aria-label="Next"
            >
              <ChevronRight size={14} strokeWidth={1.9} />
            </button>
          </div>
          <button
            onClick={goToday}
            className="h-8 px-3 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[12.5px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-strong)] transition-colors"
          >
            Today
          </button>
          <span className="font-display text-[15px] font-semibold tracking-tight text-[var(--color-ink)] ml-1">
            {title}
          </span>
        </div>
        <div
          role="tablist"
          className="inline-flex items-center rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-sunken)] p-0.5"
        >
          {views.map((v) => {
            const active = v.key === view;
            return (
              <button
                key={v.key}
                role="tab"
                aria-selected={active}
                onClick={() => setView(v.key)}
                className={`h-7 px-3 rounded text-[12px] font-medium transition-all ${
                  active
                    ? "bg-[var(--color-bg-card)] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
                    : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-[13px] text-[var(--color-ink-muted)]">
          Loading schedule…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
          <div className="p-4 lg:border-r border-[var(--color-rule)]">
            {view === "day" && (
              <DayView
                iso={toISODate(anchor)}
                onSelect={setSelectedDay}
                classes={classes}
                onClassClick={onClassClick}
              />
            )}
            {view === "week" && (
              <WeekView
                anchor={anchor}
                selectedDay={selectedDay}
                onSelect={setSelectedDay}
                classes={classes}
                todayIso={todayIso}
              />
            )}
            {view === "month" && (
              <MonthView
                anchor={anchor}
                selectedDay={selectedDay}
                onSelect={setSelectedDay}
                classes={classes}
                todayIso={todayIso}
              />
            )}
          </div>
          <DaySidePanel
            iso={selectedDay}
            classes={classes}
            groupByProgram={groupByProgram}
            onClassClick={onClassClick}
            todayIso={todayIso}
          />
        </div>
      )}
    </div>
  );
}

function DayCell({
  iso,
  label,
  sublabel,
  isSelected,
  isToday,
  isMuted,
  classes,
  onClick,
  compact,
}: {
  iso: string;
  label: string;
  sublabel?: string;
  isSelected: boolean;
  isToday: boolean;
  isMuted?: boolean;
  classes: any[];
  onClick: (iso: string) => void;
  compact?: boolean;
}) {
  const dayClasses = classesForDate(iso, classes);
  return (
    <button
      onClick={() => onClick(iso)}
      aria-current={isToday ? "date" : undefined}
      className={`group flex flex-col text-left rounded-lg border bg-[var(--color-bg-card)] transition-all ${
        compact ? "min-h-[88px]" : "min-h-[124px]"
      } p-2 ${
        isSelected
          ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent-rule)] shadow-[var(--shadow-soft)]"
          : "border-[var(--color-rule)] hover:border-[var(--color-rule-strong)]"
      } ${isMuted ? "bg-[var(--color-bg-sunken)]" : ""}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`inline-flex items-center justify-center text-[11.5px] font-semibold tabular-nums ${
            isToday
              ? "h-5 min-w-5 px-1 rounded-full bg-[var(--color-accent)] text-white"
              : isMuted
                ? "text-[var(--color-ink-faint)]"
                : "text-[var(--color-ink)]"
          }`}
        >
          {label}
        </span>
        {sublabel && (
          <span className="text-[9.5px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            {sublabel}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {dayClasses.slice(0, compact ? 2 : 4).map((c) => {
          const done = isClassCompleted(iso, c.start_time, c.duration_minutes);
          return (
            <span
              key={c.id}
              className={`truncate text-[10.5px] leading-[1.3] rounded px-1.5 py-[3px] border ${
                done
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-accent-rule)]"
                  : "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] border-[var(--color-rule)]"
              }`}
            >
              <span className="tabular-nums font-medium">
                {formatUtcTime(c.start_time, iso)}
              </span>
              <span className="mx-1 text-[var(--color-ink-faint)]">·</span>
              <span className="font-medium">{c.name}</span>
            </span>
          );
        })}
        {dayClasses.length > (compact ? 2 : 4) && (
          <span className="text-[10px] text-[var(--color-ink-muted)] px-1">
            +{dayClasses.length - (compact ? 2 : 4)} more
          </span>
        )}
      </div>
    </button>
  );
}

function DayView({
  iso,
  onSelect,
  classes,
  onClassClick,
}: {
  iso: string;
  onSelect: (iso: string) => void;
  classes: any[];
  onClassClick?: (cls: any, iso: string) => void;
}) {
  useEffect(() => {
    onSelect(iso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);
  const dayClasses = classesForDate(iso, classes);
  return (
    <div className="flex flex-col">
      {dayClasses.length === 0 ? (
        <div className="py-16 text-center text-[13px] text-[var(--color-ink-muted)]">
          No classes scheduled.
        </div>
      ) : (
        <ol className="flex flex-col">
          {dayClasses.map((c, idx) => (
            <TimelineRow
              key={c.id}
              c={c}
              iso={iso}
              onClick={onClassClick ? () => onClassClick(c, iso) : undefined}
              last={idx === dayClasses.length - 1}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function TimelineRow({
  c,
  iso,
  onClick,
  last,
}: {
  c: any;
  iso: string;
  onClick?: () => void;
  last?: boolean;
}) {
  const done = isClassCompleted(iso, c.start_time, c.duration_minutes);
  const Container: any = onClick ? "button" : "div";
  return (
    <li className="relative flex gap-4">
      <div className="pt-3 text-right w-20 shrink-0">
        <div className="text-[12.5px] font-semibold tabular-nums text-[var(--color-ink)]">
          {formatUtcTime(c.start_time, iso)}
        </div>
        {c.duration_minutes ? (
          <div className="text-[11px] tabular-nums text-[var(--color-ink-muted)] mt-0.5">
            {formatUtcTimePlusMinutes(c.start_time, c.duration_minutes, iso)}
          </div>
        ) : null}
      </div>
      <div className="relative flex flex-col items-center">
        <span
          className={`mt-4 h-2 w-2 rounded-full ${
            done
              ? "bg-[var(--color-accent)]"
              : "bg-[var(--color-ink-faint)] ring-2 ring-[var(--color-bg-card)]"
          }`}
        />
        {!last && (
          <span className="flex-1 w-px bg-[var(--color-rule)] mt-1" />
        )}
      </div>
      <Container
        onClick={onClick}
        className={`flex-1 text-left rounded-lg border border-[var(--color-rule)] bg-[var(--color-bg-card)] my-1 px-4 py-3 ${
          onClick
            ? "hover:border-[var(--color-rule-strong)] hover:shadow-[var(--shadow-soft)] transition-all"
            : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-semibold text-[var(--color-ink)] truncate">
                {c.name}
              </span>
              {done && <CompletedBadge />}
            </div>
            {c.program?.name && (
              <div className="text-[11.5px] text-[var(--color-ink-muted)] mt-0.5 truncate">
                {c.program.name}
              </div>
            )}
          </div>
          {c.coach && (
            <span className="shrink-0 inline-flex items-center gap-1.5 h-6 pl-1 pr-2.5 rounded-full bg-[var(--color-bg-soft)] border border-[var(--color-rule)]">
              <span className="h-4 w-4 rounded-full bg-[var(--color-accent)] text-white text-[9px] font-semibold flex items-center justify-center">
                {(c.coach.first_name?.[0] ?? "").toUpperCase()}
              </span>
              <span className="text-[11px] font-medium text-[var(--color-ink-soft)]">
                {c.coach.first_name} {c.coach.last_name?.[0]}.
              </span>
            </span>
          )}
        </div>
      </Container>
    </li>
  );
}

function CompletedBadge() {
  return (
    <span
      title="Completed"
      className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] text-[10px] font-medium border border-[var(--color-accent-rule)]"
    >
      <Check size={10} strokeWidth={2.5} />
      Done
    </span>
  );
}

function WeekView({
  anchor,
  selectedDay,
  onSelect,
  classes,
  todayIso,
}: {
  anchor: Date;
  selectedDay: string;
  onSelect: (iso: string) => void;
  classes: any[];
  todayIso: string;
}) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d, idx) => {
        const iso = toISODate(d);
        return (
          <DayCell
            key={iso}
            iso={iso}
            label={String(d.getDate())}
            sublabel={dayLabels[idx]}
            isSelected={selectedDay === iso}
            isToday={todayIso === iso}
            classes={classes}
            onClick={onSelect}
          />
        );
      })}
    </div>
  );
}

function MonthView({
  anchor,
  selectedDay,
  onSelect,
  classes,
  todayIso,
}: {
  anchor: Date;
  selectedDay: string;
  onSelect: (iso: string) => void;
  classes: any[];
  todayIso: string;
}) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const month = anchor.getMonth();
  const weekdayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-2">
        {weekdayHeaders.map((w) => (
          <div
            key={w}
            className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--color-ink-muted)] text-center py-1"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((d) => {
          const iso = toISODate(d);
          return (
            <DayCell
              key={iso}
              iso={iso}
              label={String(d.getDate())}
              isSelected={selectedDay === iso}
              isToday={todayIso === iso}
              isMuted={d.getMonth() !== month}
              classes={classes}
              onClick={onSelect}
              compact
            />
          );
        })}
      </div>
    </div>
  );
}

function DaySidePanel({
  iso,
  classes,
  groupByProgram,
  onClassClick,
  todayIso,
}: {
  iso: string;
  classes: any[];
  groupByProgram: boolean;
  onClassClick?: (cls: any, iso: string) => void;
  todayIso: string;
}) {
  const d = fromISODate(iso);
  const dayClasses = classesForDate(iso, classes);
  const isToday = iso === todayIso;

  const groups = new Map<string, { program: any; rows: any[] }>();
  if (groupByProgram) {
    for (const c of dayClasses) {
      const key = c.program?.id || c.program_id || "__none__";
      const entry = groups.get(key) || {
        program: c.program || { id: key, name: "Unassigned" },
        rows: [] as any[],
      };
      entry.rows.push(c);
      groups.set(key, entry);
    }
  }
  const groupList = Array.from(groups.values()).sort((a, b) =>
    (a.program?.name || "").localeCompare(b.program?.name || ""),
  );

  return (
    <aside className="p-5 bg-[var(--color-bg-sunken)] lg:bg-[var(--color-bg-card)]">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-[var(--color-ink-muted)] mb-1">
            {isToday ? "Today" : "Selected day"}
          </div>
          <div className="font-display text-[17px] font-semibold tracking-tight text-[var(--color-ink)]">
            {d.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
        <span className="inline-flex items-center h-5 px-2 rounded-full bg-[var(--color-bg-soft)] border border-[var(--color-rule)] text-[11px] font-medium tabular-nums text-[var(--color-ink-soft)]">
          {dayClasses.length}
        </span>
      </div>

      {dayClasses.length === 0 ? (
        <div className="text-center py-10 rounded-lg border border-dashed border-[var(--color-rule)] text-[12.5px] text-[var(--color-ink-muted)]">
          No classes on this day.
        </div>
      ) : groupByProgram ? (
        <div className="flex flex-col gap-5">
          {groupList.map(({ program, rows }) => (
            <div key={program?.id || program?.name}>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-1 w-1 rounded-full bg-[var(--color-accent)]" />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
                  {program?.name || "Unassigned"}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {rows.map((c: any) => (
                  <ClassRow
                    key={c.id}
                    c={c}
                    iso={iso}
                    onClick={
                      onClassClick ? () => onClassClick(c, iso) : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {dayClasses.map((c) => (
            <ClassRow
              key={c.id}
              c={c}
              iso={iso}
              onClick={onClassClick ? () => onClassClick(c, iso) : undefined}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

function ClassRow({
  c,
  iso,
  onClick,
}: {
  c: any;
  iso: string;
  onClick?: () => void;
}) {
  const done = isClassCompleted(iso, c.start_time, c.duration_minutes);
  const body = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-14 text-left">
          <div className="text-[12px] font-semibold tabular-nums text-[var(--color-ink)]">
            {formatUtcTime(c.start_time, iso)}
          </div>
          {c.duration_minutes ? (
            <div className="text-[10px] tabular-nums text-[var(--color-ink-muted)] mt-0.5">
              {c.duration_minutes}m
            </div>
          ) : null}
        </div>
        <span className="h-8 w-px bg-[var(--color-rule)]" />
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] font-medium text-[var(--color-ink)] truncate">
              {c.name}
            </span>
            {done && (
              <Check
                size={11}
                strokeWidth={2.5}
                className="text-[var(--color-accent)] shrink-0"
              />
            )}
          </div>
          {c.coach && (
            <div className="text-[10.5px] text-[var(--color-ink-muted)] truncate">
              {c.coach.first_name} {c.coach.last_name}
            </div>
          )}
        </div>
      </div>
    </>
  );
  const baseClass = `w-full flex items-center rounded-md border bg-[var(--color-bg-card)] px-3 py-2 ${
    done
      ? "border-[var(--color-accent-rule)]"
      : "border-[var(--color-rule)]"
  }`;
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClass} hover:border-[var(--color-rule-strong)] hover:shadow-[var(--shadow-soft)] transition-all`}
      >
        {body}
      </button>
    );
  }
  return <div className={baseClass}>{body}</div>;
}
