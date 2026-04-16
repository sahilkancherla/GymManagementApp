"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CreditCard, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";

type MembershipFormState = {
  name: string;
  price: string;
  type: "monthly" | "annual" | "count";
  class_count: string;
  program_ids: string[];
};

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

export default function EditMembershipPage() {
  const params = useParams();
  const router = useRouter();
  const gymId = params.gymId as string;
  const planId = params.planId as string;

  const [plan, setPlan] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
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
  const [successAt, setSuccessAt] = useState<number | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId, planId]);

  async function loadData() {
    setLoading(true);
    try {
      const [plansRes, programsRes] = await Promise.all([
        apiFetch(`/gyms/${gymId}/plans`),
        apiFetch(`/gyms/${gymId}/programs`),
      ]);
      const found = (plansRes || []).find((p: any) => p.id === planId);
      if (!found) {
        setNotFound(true);
      } else {
        setPlan(found);
        setForm({
          name: found.name,
          price: (found.price_cents / 100).toFixed(2),
          type: found.type,
          class_count: found.class_count ? String(found.class_count) : "",
          program_ids: found.program_ids || [],
        });
      }
      setPrograms(programsRes || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load membership");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
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
      setPlan({ ...plan, ...updated, ...body });
      setSuccessAt(Date.now());
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

  if (loading) {
    return (
      <div className="max-w-3xl">
        <p className="text-[var(--color-ink-soft)]">Loading membership…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-3xl">
        <BackButton href={`/gym/${gymId}`} label="Back to gym" className="mb-4" />
        <div className="border border-[var(--color-rule)] rounded-xl p-12 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center mb-3">
            <CreditCard size={16} className="text-[var(--color-ink-muted)]" strokeWidth={1.75} />
          </div>
          <p className="text-[var(--color-ink-soft)] text-sm">Membership not found.</p>
        </div>
      </div>
    );
  }

  const dirty =
    form.name !== plan.name ||
    parsePriceToCents(form.price) !== plan.price_cents ||
    form.type !== plan.type ||
    (form.type === "count" && (parseInt(form.class_count) || null) !== plan.class_count) ||
    JSON.stringify([...form.program_ids].sort()) !==
      JSON.stringify([...(plan.program_ids || [])].sort());

  return (
    <div className="max-w-3xl">
      <BackButton href={`/gym/${gymId}`} label="Gym" className="mb-4" />

      {/* Header */}
      <header className="pb-6 mb-6 border-b border-[var(--color-rule)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10.5px] tracking-[0.14em] uppercase text-[var(--color-accent)] font-medium mb-1">
              Membership
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight leading-tight">
              {plan.name}
            </h1>
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
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] text-xs font-semibold tabular-nums shrink-0">
            <Users size={12} strokeWidth={2.25} />
            {plan.subscriber_count || 0}{" "}
            <span className="font-normal">active</span>
          </span>
        </div>
      </header>

      {/* Edit form */}
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div className="text-[10.5px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] font-medium">
          Details
        </div>

        <div className="grid grid-cols-[1fr_10rem] gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="em-name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="em-name"
              className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="em-price" className="text-sm font-medium">
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
                className="h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-white pl-6 pr-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
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
          <label className="text-sm font-medium">Billing</label>
          <div className="inline-flex gap-1.5 p-1 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)] w-fit">
            {(["monthly", "annual", "count"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className={`h-8 px-3.5 rounded text-[13px] font-medium capitalize transition-colors ${
                  form.type === t
                    ? "bg-white text-[var(--color-ink)] shadow-sm"
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
                className="h-9 w-24 rounded-md border border-[var(--color-rule-strong)] bg-white px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                value={form.class_count}
                onChange={(e) => setForm({ ...form, class_count: e.target.value })}
              />
              <span className="text-[13px] text-[var(--color-ink-muted)]">classes included</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Applies to programs</label>
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

        {successAt && !error && !dirty && (
          <div className="rounded-md border border-[var(--color-accent-rule)] bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] text-sm px-3 py-2">
            Changes saved.
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-rule)]">
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={deactivating}
            className="h-9 px-3 rounded-md border border-[var(--color-rule)] text-xs font-medium text-[var(--color-ink-muted)] hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-60"
          >
            {deactivating ? "Deactivating…" : "Deactivate membership"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push(`/gym/${gymId}`)}
              className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim() || !dirty}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
