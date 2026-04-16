"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Globe2,
  Layers,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Announcement = {
  id: string;
  gym_id: string;
  author_id: string;
  title: string;
  body: string;
  pinned: boolean;
  program_id: string | null;
  plan_id: string | null;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

type ProgramOpt = { id: string; name: string };
type PlanOpt = { id: string; name: string };

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function authorInitial(a: Announcement) {
  const f = a.author?.first_name?.[0];
  const l = a.author?.last_name?.[0];
  return ((f || "") + (l || "")).toUpperCase() || "A";
}

function authorName(a: Announcement) {
  const parts = [a.author?.first_name, a.author?.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Admin";
}

export function AnnouncementsPanel({
  gymId,
  canManage,
}: {
  gymId: string;
  canManage: boolean;
}) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);

  const [programs, setPrograms] = useState<ProgramOpt[]>([]);
  const [plans, setPlans] = useState<PlanOpt[]>([]);

  const programsById = useMemo(
    () => new Map(programs.map((p) => [p.id, p])),
    [programs],
  );
  const plansById = useMemo(
    () => new Map(plans.map((p) => [p.id, p])),
    [plans],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    (async () => {
      try {
        const [progs, pls] = await Promise.all([
          apiFetch(`/gyms/${gymId}/programs`).catch(() => []),
          apiFetch(`/gyms/${gymId}/plans`).catch(() => []),
        ]);
        if (cancelled) return;
        setPrograms(
          (progs || []).map((p: any) => ({ id: p.id, name: p.name })),
        );
        setPlans((pls || []).map((p: any) => ({ id: p.id, name: p.name })));
      } catch {
        // non-fatal — composer just won't have target options
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gymId, canManage]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/gyms/${gymId}/announcements`);
      setItems(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await apiFetch(`/gyms/${gymId}/announcements/${id}`, { method: "DELETE" });
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete");
    }
  }

  async function handleTogglePin(item: Announcement) {
    try {
      const updated = await apiFetch(
        `/gyms/${gymId}/announcements/${item.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ pinned: !item.pinned }),
        },
      );
      setItems((xs) => {
        const next = xs.map((x) => (x.id === item.id ? updated : x));
        return [...next].sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
      });
    } catch (err: any) {
      alert(err?.message || "Failed to update pin");
    }
  }

  return (
    <section>
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--color-accent)] mb-1">
            Broadcasts
          </p>
          <h2 className="text-[20px] font-semibold leading-tight tracking-tight text-[var(--color-ink)]">
            Announcements
          </h2>
          <p className="text-[13px] text-[var(--color-ink-soft)] mt-1">
            {canManage
              ? "Post updates, events, and policy changes visible to every member."
              : "Updates and news from your gym admins."}
          </p>
        </div>
        {canManage && !composerOpen && !editing && (
          <button
            onClick={() => setComposerOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.25} />
            New announcement
          </button>
        )}
      </header>

      {canManage && (composerOpen || editing) && (
        <AnnouncementComposer
          key={editing?.id || "new"}
          gymId={gymId}
          initial={editing}
          programs={programs}
          plans={plans}
          onClose={() => {
            setComposerOpen(false);
            setEditing(null);
          }}
          onSaved={(saved, mode) => {
            setItems((xs) => {
              let next: Announcement[];
              if (mode === "create") next = [saved, ...xs];
              else next = xs.map((x) => (x.id === saved.id ? saved : x));
              return [...next].sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return (
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
                );
              });
            });
            setComposerOpen(false);
            setEditing(null);
          }}
        />
      )}

      {loading ? (
        <div className="text-[13px] text-[var(--color-ink-muted)]">
          Loading announcements…
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState canManage={canManage} onNew={() => setComposerOpen(true)} />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((a) => (
            <AnnouncementCard
              key={a.id}
              item={a}
              canManage={canManage}
              programName={
                a.program_id ? programsById.get(a.program_id)?.name : undefined
              }
              planName={
                a.plan_id ? plansById.get(a.plan_id)?.name : undefined
              }
              onEdit={() => setEditing(a)}
              onDelete={() => handleDelete(a.id)}
              onTogglePin={() => handleTogglePin(a)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- sub-components ---------- */

function AnnouncementCard({
  item,
  canManage,
  programName,
  planName,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  item: Announcement;
  canManage: boolean;
  programName?: string;
  planName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const targetLabel = item.program_id
    ? programName
      ? `Program · ${programName}`
      : "Program"
    : item.plan_id
      ? planName
        ? `Membership · ${planName}`
        : "Membership"
      : null;
  const TargetIcon = item.program_id ? Layers : item.plan_id ? CreditCard : null;
  return (
    <li
      className={`relative rounded-xl border bg-[var(--color-bg-card)] p-5 transition-colors ${
        item.pinned
          ? "border-[var(--color-accent-rule)] bg-[var(--color-accent-wash)]"
          : "border-[var(--color-rule)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-[var(--color-accent)] text-white text-[12px] font-semibold flex items-center justify-center shrink-0">
          {authorInitial(item)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
              {item.title}
            </h3>
            {item.pinned && (
              <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-[var(--color-accent-tint)] text-[var(--color-accent-ink)] text-[10px] font-medium border border-[var(--color-accent-rule)]">
                <Pin size={10} strokeWidth={2.25} />
                Pinned
              </span>
            )}
            {targetLabel && TargetIcon && (
              <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] text-[10px] font-medium border border-[var(--color-rule)]">
                <TargetIcon size={10} strokeWidth={2} />
                {targetLabel}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11.5px] text-[var(--color-ink-muted)]">
            <span className="font-medium text-[var(--color-ink-soft)]">
              {authorName(item)}
            </span>{" "}
            · {relativeTime(item.created_at)}
            {item.updated_at &&
              new Date(item.updated_at).getTime() -
                new Date(item.created_at).getTime() >
                60_000 && <> · edited</>}
          </div>
          <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--color-ink-soft)] whitespace-pre-wrap">
            {item.body}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <IconButton
              label={item.pinned ? "Unpin" : "Pin"}
              onClick={onTogglePin}
            >
              {item.pinned ? (
                <PinOff size={14} strokeWidth={1.75} />
              ) : (
                <Pin size={14} strokeWidth={1.75} />
              )}
            </IconButton>
            <IconButton label="Edit" onClick={onEdit}>
              <Pencil size={14} strokeWidth={1.75} />
            </IconButton>
            <IconButton label="Delete" onClick={onDelete} destructive>
              <Trash2 size={14} strokeWidth={1.75} />
            </IconButton>
          </div>
        )}
      </div>
    </li>
  );
}

function IconButton({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`h-7 w-7 inline-flex items-center justify-center rounded-md border border-transparent transition-colors ${
        destructive
          ? "text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] hover:border-[var(--color-danger-soft)]"
          : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({
  canManage,
  onNew,
}: {
  canManage: boolean;
  onNew: () => void;
}) {
  return (
    <div className="relative border border-dashed border-[var(--color-rule-strong)] rounded-xl bg-[var(--color-bg-sunken)] p-10 flex flex-col items-center justify-center text-center overflow-hidden">
      <div className="absolute inset-0 bg-grid-fade opacity-60 pointer-events-none" />
      <div className="relative">
        <div className="mx-auto h-10 w-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-rule)] flex items-center justify-center mb-4 shadow-[var(--shadow-soft)]">
          <Megaphone
            size={18}
            strokeWidth={1.6}
            className="text-[var(--color-accent)]"
          />
        </div>
        <h3 className="text-[15px] font-semibold text-[var(--color-ink)] mb-1">
          {canManage ? "No announcements yet" : "Nothing posted yet"}
        </h3>
        <p className="text-[13px] text-[var(--color-ink-soft)] mb-5 max-w-xs">
          {canManage
            ? "Post your first update to let members know what's happening."
            : "Check back later — your admins will post updates here."}
        </p>
        {canManage && (
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.25} />
            Write announcement
          </button>
        )}
      </div>
    </div>
  );
}

function AnnouncementComposer({
  gymId,
  initial,
  programs,
  plans,
  onClose,
  onSaved,
}: {
  gymId: string;
  initial: Announcement | null;
  programs: ProgramOpt[];
  plans: PlanOpt[];
  onClose: () => void;
  onSaved: (item: Announcement, mode: "create" | "update") => void;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [pinned, setPinned] = useState(!!initial?.pinned);
  const initialTarget: "gym" | "program" | "plan" = initial?.program_id
    ? "program"
    : initial?.plan_id
      ? "plan"
      : "gym";
  const [target, setTarget] = useState<"gym" | "program" | "plan">(
    initialTarget,
  );
  const [programId, setProgramId] = useState<string>(initial?.program_id || "");
  const [planId, setPlanId] = useState<string>(initial?.plan_id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode = initial ? "update" : "create";
  const canSubmit = useMemo(() => {
    if (saving) return false;
    if (title.trim().length === 0 || body.trim().length === 0) return false;
    if (target === "program" && !programId) return false;
    if (target === "plan" && !planId) return false;
    return true;
  }, [title, body, saving, target, programId, planId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        pinned,
        program_id: target === "program" ? programId : null,
        plan_id: target === "plan" ? planId : null,
      };
      const saved = initial
        ? await apiFetch(`/gyms/${gymId}/announcements/${initial.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await apiFetch(`/gyms/${gymId}/announcements`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
      onSaved(saved, mode);
    } catch (err: any) {
      setError(err?.message || "Failed to save announcement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-5 rounded-xl border border-[var(--color-accent-rule)] bg-[var(--color-bg-card)] overflow-hidden shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-rule)] bg-[var(--color-accent-wash)]">
        <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--color-accent-ink)]">
          <Megaphone size={14} strokeWidth={2} />
          {mode === "create" ? "New announcement" : "Edit announcement"}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)]"
          aria-label="Close composer"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="announcement-title"
            className="text-[11.5px] font-medium text-[var(--color-ink-soft)] uppercase tracking-wide"
          >
            Title
          </label>
          <input
            id="announcement-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder="e.g. Holiday hours this weekend"
            className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[14px] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-rule)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="announcement-body"
            className="text-[11.5px] font-medium text-[var(--color-ink-soft)] uppercase tracking-wide"
          >
            Message
          </label>
          <textarea
            id="announcement-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            rows={5}
            placeholder="Share the details with your members…"
            className="rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 py-2.5 text-[14px] leading-[1.55] resize-y focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-rule)]"
          />
          <div className="flex justify-end text-[11px] tabular-nums text-[var(--color-ink-muted)]">
            {body.length}/4000
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11.5px] font-medium text-[var(--color-ink-soft)] uppercase tracking-wide">
            Audience
          </span>
          <div className="inline-flex p-0.5 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-soft)] self-start">
            {(
              [
                { id: "gym", label: "Whole gym", icon: Globe2 },
                { id: "program", label: "Program", icon: Layers },
                { id: "plan", label: "Membership", icon: CreditCard },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = target === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTarget(opt.id)}
                  className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[12px] font-medium transition-colors ${
                    active
                      ? "bg-[var(--color-bg-card)] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
                      : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
                  }`}
                >
                  <Icon size={12} strokeWidth={2} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {target === "program" && (
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="h-9 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13px] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-rule)]"
            >
              <option value="">Select a program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {target === "plan" && (
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="h-9 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13px] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-rule)]"
            >
              <option value="">Select a membership…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <p className="text-[11.5px] text-[var(--color-ink-muted)]">
            {target === "gym"
              ? "Visible to every active member of this gym."
              : target === "program"
                ? "Only members actively enrolled in this program will see it."
                : "Only members with an active subscription to this membership will see it."}
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-[13px] text-[var(--color-ink-soft)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="accent-[var(--color-accent)] h-4 w-4"
          />
          <Pin size={12} strokeWidth={2} />
          Pin to the top of announcements
        </label>

        {error && (
          <p className="text-[12.5px] text-[var(--color-danger)]">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] text-[13px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
          >
            {saving
              ? mode === "create"
                ? "Publishing…"
                : "Saving…"
              : mode === "create"
                ? "Publish"
                : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
