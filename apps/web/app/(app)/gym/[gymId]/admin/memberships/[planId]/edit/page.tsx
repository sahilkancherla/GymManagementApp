"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, Pencil, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";

type MembershipFormState = {
  name: string;
  price: string;
  type: "monthly" | "annual" | "count";
  class_count: string;
  program_ids: string[];
};

const PAGE_SIZES = [10, 50, 100] as const;

function parsePriceToCents(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  const dollars = parseFloat(cleaned);
  if (!Number.isFinite(dollars) || dollars < 0) return 0;
  return Math.round(dollars * 100);
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function PaginationBar({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[var(--color-ink-muted)]">Show</span>
        <div className="inline-flex gap-0.5 p-0.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)]">
          {PAGE_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => onPageSizeChange(s)}
              className={`h-6 px-2 rounded text-[11px] font-medium tabular-nums transition-colors ${
                pageSize === s
                  ? "bg-[var(--color-ink)] text-white"
                  : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[var(--color-ink-muted)] tabular-nums">
          {start}–{end} of {total}
        </span>
        <div className="flex gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="h-7 w-7 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-[12px]"
          >
            ‹
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="h-7 w-7 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-[12px]"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditMembershipPage() {
  const params = useParams();
  const router = useRouter();
  const gymId = params.gymId as string;
  const planId = params.planId as string;

  const [plan, setPlan] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MembershipFormState>({
    name: "",
    price: "",
    type: "monthly",
    class_count: "",
    program_ids: [],
  });
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [subsPage, setSubsPage] = useState(1);
  const [subsPageSize, setSubsPageSize] = useState<number>(10);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId, planId]);

  function resetForm(p: any) {
    setForm({
      name: p.name,
      price: (p.price_cents / 100).toFixed(2),
      type: p.type,
      class_count: p.class_count ? String(p.class_count) : "",
      program_ids: p.program_ids || [],
    });
  }

  async function loadData() {
    setLoading(true);
    setSubsLoading(true);
    try {
      const [plansRes, programsRes, subsRes] = await Promise.all([
        apiFetch(`/gyms/${gymId}/plans`),
        apiFetch(`/gyms/${gymId}/programs`),
        apiFetch(`/gyms/${gymId}/plans/${planId}/subscribers`),
      ]);
      const found = (plansRes || []).find((p: any) => p.id === planId);
      if (!found) {
        setNotFound(true);
      } else {
        setPlan(found);
        resetForm(found);
      }
      setPrograms(programsRes || []);
      setSubscribers(subsRes || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load membership");
    } finally {
      setLoading(false);
      setSubsLoading(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        price_cents: parsePriceToCents(form.price),
        type: form.type,
        class_count:
          form.type === "count" ? parseInt(form.class_count) || null : null,
        program_ids: form.program_ids,
      };
      const updated = await apiFetch(`/gyms/${gymId}/plans/${planId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const merged = { ...plan, ...updated, ...body };
      setPlan(merged);
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || "Failed to save membership");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm("Deactivate this membership? Active subscribers will keep access until their period ends.")) return;
    setDeactivating(true);
    try {
      await apiFetch(`/gyms/${gymId}/plans/${planId}`, { method: "DELETE" });
      router.push(`/gym/${gymId}?tab=memberships`);
    } catch (err: any) {
      setError(err?.message || "Failed to deactivate");
      setDeactivating(false);
    }
  }

  function toggleProgram(id: string) {
    setForm((prev) => ({
      ...prev,
      program_ids: prev.program_ids.includes(id)
        ? prev.program_ids.filter((p) => p !== id)
        : [...prev.program_ids, id],
    }));
  }

  const billingLabel = (t: string) =>
    t === "monthly" ? "/ month" : t === "annual" ? "/ year" : "one-time";

  const paginatedSubs = useMemo(() => {
    const start = (subsPage - 1) * subsPageSize;
    return subscribers.slice(start, start + subsPageSize);
  }, [subscribers, subsPage, subsPageSize]);

  if (loading) {
    return (
      <div>
        <p className="text-[var(--color-ink-soft)]">Loading membership…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div>
        <BackButton href={`/gym/${gymId}?tab=memberships`} label="Memberships" className="mb-4" />
        <div className="border border-[var(--color-rule)] rounded-xl p-12 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center mb-3">
            <CreditCard size={16} className="text-[var(--color-ink-muted)]" strokeWidth={1.75} />
          </div>
          <p className="text-[var(--color-ink-soft)] text-sm">Membership not found.</p>
        </div>
      </div>
    );
  }

  const linkedPrograms = programs.filter((p) =>
    (plan.program_ids || []).includes(p.id),
  );

  return (
    <div>
      <div className="mb-4">
        <BackButton href={`/gym/${gymId}?tab=memberships`} label="Memberships" />
      </div>

      {editing ? (
        <section className="rounded-xl border border-[var(--color-accent-rule)] bg-[var(--color-bg-card)] shadow-[var(--shadow-soft)] p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent-rule)]" />
            <h2 className="font-display text-base font-semibold tracking-tight">
              Edit membership
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[1fr_10rem] gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="em-name" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                  Name
                </label>
                <input
                  id="em-name"
                  className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="em-price" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                  Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)] pointer-events-none tabular-nums">
                    $
                  </span>
                  <input
                    id="em-price"
                    inputMode="decimal"
                    placeholder="99.00"
                    className="h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] pl-6 pr-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                    value={form.price}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*(?:\.\d{0,2})?$/.test(v)) {
                        setForm({ ...form, price: v });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Billing</label>
              <div className="inline-flex gap-1.5 p-1 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)] w-fit">
                {(["monthly", "annual", "count"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={`h-8 px-3.5 rounded text-[13px] font-medium capitalize transition-colors ${
                      form.type === t
                        ? "bg-[var(--color-bg-card)] text-[var(--color-ink)] shadow-sm"
                        : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {t === "count" ? "Class pack" : t}
                  </button>
                ))}
              </div>
              {form.type === "count" && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    inputMode="numeric"
                    placeholder="10"
                    className="h-9 w-24 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                    value={form.class_count}
                    onChange={(e) => setForm({ ...form, class_count: e.target.value })}
                  />
                  <span className="text-[13px] text-[var(--color-ink-muted)]">classes included</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Applies to programs</label>
              {programs.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--color-rule-strong)] bg-[var(--color-bg-sunken)] px-3 py-3 text-xs text-[var(--color-ink-muted)]">
                  No programs yet. Without a program this plan grants gym-wide access.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {programs.map((p) => {
                    const checked = form.program_ids.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProgram(p.id)}
                        className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                          checked
                            ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                            : "border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              )}
              <span className="text-[11px] text-[var(--color-ink-muted)]">
                Leave empty for gym-wide access (no program filter).
              </span>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  resetForm(plan);
                  setError(null);
                }}
                className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight">
                {plan.name}
              </h1>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-[var(--color-rule)] text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors"
              >
                <Pencil size={12} strokeWidth={1.75} />
                Edit
              </button>
            </div>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="font-display text-xl font-semibold tabular-nums tracking-tight text-[var(--color-ink)]">
                {formatPrice(plan.price_cents)}
              </span>
              <span className="text-[13px] text-[var(--color-ink-muted)]">
                {billingLabel(plan.type)}
              </span>
              {plan.type === "count" && plan.class_count && (
                <span className="text-[13px] text-[var(--color-ink-soft)] ml-1">
                  · {plan.class_count} classes
                </span>
              )}
            </div>
            {linkedPrograms.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {linkedPrograms.map((p: any) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] border border-[var(--color-rule)]"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] text-xs font-semibold tabular-nums shrink-0">
            <Users size={12} strokeWidth={2.25} />
            {plan.subscriber_count || 0}{" "}
            <span className="font-normal">active</span>
          </span>
        </section>
      )}

      {/* Subscribers list */}
      {!editing && (
        <section className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-[10.5px] font-medium tracking-[0.14em] uppercase text-[var(--color-ink-muted)]">
                Subscribers
              </p>
              <h2 className="font-display text-xl font-semibold tracking-tight mt-0.5">
                Members
              </h2>
              <p className="text-[13px] text-[var(--color-ink-soft)] mt-0.5">
                Active subscribers on this membership plan.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
            {subsLoading ? (
              <div className="text-center py-14">
                <p className="text-[13px] text-[var(--color-ink-muted)]">Loading subscribers…</p>
              </div>
            ) : subscribers.length === 0 ? (
              <div className="text-center py-14">
                <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center mb-3">
                  <Users size={16} className="text-[var(--color-ink-muted)]" strokeWidth={1.75} />
                </div>
                <p className="text-[13px] text-[var(--color-ink-muted)]">
                  No active subscribers on this plan yet.
                </p>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
                      <th className="text-left px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                        Member
                      </th>
                      <th className="text-left px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                        Since
                      </th>
                      <th className="text-right px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSubs.map((s: any) => {
                      const initials = `${(s.profile?.first_name?.[0] || "").toUpperCase()}${(s.profile?.last_name?.[0] || "").toUpperCase()}`;
                      return (
                        <tr
                          key={s.id}
                          className="border-b border-[var(--color-rule)] last:border-b-0 hover:bg-[var(--color-bg-sunken)] transition-colors"
                        >
                          <td className="px-5 py-3">
                            <Link
                              href={`/gym/${gymId}/members/${s.user_id}`}
                              className="flex items-center gap-3 no-underline text-[var(--color-ink)]"
                            >
                              <div className="w-9 h-9 rounded-full bg-[var(--color-bg-soft)] ring-1 ring-[var(--color-rule)] flex items-center justify-center overflow-hidden shrink-0">
                                {s.profile?.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={s.profile.avatar_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[11px] font-semibold text-[var(--color-ink-soft)]">
                                    {initials || "—"}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13.5px] font-medium truncate">
                                  {s.profile?.first_name} {s.profile?.last_name}
                                </div>
                                <div className="text-[11.5px] text-[var(--color-ink-muted)] truncate">
                                  {s.profile?.email || "—"}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[12px] text-[var(--color-ink-soft)] tabular-nums">
                              {new Date(s.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-medium border bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-accent-rule)]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                              Active
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {subscribers.length > PAGE_SIZES[0] && (
                  <PaginationBar
                    total={subscribers.length}
                    page={subsPage}
                    pageSize={subsPageSize}
                    onPageChange={setSubsPage}
                    onPageSizeChange={(s) => {
                      setSubsPageSize(s);
                      setSubsPage(1);
                    }}
                  />
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Danger zone */}
      {!editing && (
        <section className="border-t border-[var(--color-rule)] pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">
                Deactivate membership
              </h3>
              <p className="text-[12px] text-[var(--color-ink-muted)] mt-0.5">
                Active subscribers will keep access until their period ends.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={deactivating}
              className="h-9 px-3 rounded-md border border-[var(--color-rule)] text-xs font-medium text-[var(--color-ink-muted)] hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-60"
            >
              {deactivating ? "Deactivating…" : "Deactivate"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
