"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";

export default function ManagePlansPage() {
  const { gymId } = useParams();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price_cents: 0,
    billing_period: "monthly" as string | null,
    class_count: null as number | null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlans();
  }, [gymId]);

  async function loadPlans() {
    if (!gymId) return;
    try {
      const data = await apiFetch(`/gyms/${gymId}/plans`);
      setPlans(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/gyms/${gymId}/plans`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          price_cents: form.price_cents,
          billing_period: form.billing_period,
          class_count: form.class_count,
        }),
      });
      setShowForm(false);
      setForm({
        name: "",
        description: "",
        price_cents: 0,
        billing_period: "monthly",
        class_count: null,
      });
      loadPlans();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(planId: string) {
    try {
      await apiFetch(`/gyms/${gymId}/plans/${planId}`, { method: "DELETE" });
      loadPlans();
    } catch (err) {
      console.error(err);
    }
  }

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  if (loading) return <p className="text-[13px] text-[var(--color-ink-soft)]">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <BackButton href={`/gym/${gymId}`} label="Gym" className="mb-4" />

      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight text-[var(--color-ink)]">
            Manage Plans
          </h1>
          <p className="text-[13px] text-[var(--color-ink-soft)] mt-1">
            Create and manage pricing plans for your gym.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.25} />
            New plan
          </button>
        )}
      </header>

      {showForm && (
        <div className="mb-5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] p-5">
          <h3 className="text-[13px] font-semibold text-[var(--color-ink)] mb-4">Create Plan</h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="plan-name" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Plan name</label>
              <input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="plan-desc" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Description</label>
              <input
                id="plan-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="plan-price" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Price ($)</label>
                <input
                  id="plan-price"
                  inputMode="decimal"
                  value={(form.price_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price_cents: Math.round(parseFloat(e.target.value) * 100) || 0,
                    })
                  }
                  className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Billing period</label>
                <select
                  value={form.billing_period || "none"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      billing_period: e.target.value === "none" ? null : e.target.value,
                    })
                  }
                  className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="none">None (class pack)</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="plan-count" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                Class count <span className="normal-case tracking-normal">(leave empty for unlimited)</span>
              </label>
              <input
                id="plan-count"
                inputMode="numeric"
                value={form.class_count != null ? String(form.class_count) : ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    class_count: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
              >
                {saving ? "Creating…" : "Create plan"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {plans.map((plan) => (
          <div key={plan.id} className="border border-[var(--color-rule)] rounded-lg bg-[var(--color-bg-card)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{plan.name}</h3>
                <p className="text-[13px] text-[var(--color-ink-soft)] mt-0.5 tabular-nums">
                  {formatPrice(plan.price_cents)}
                  {plan.billing_period && ` / ${plan.billing_period}`}
                  {plan.class_count && ` · ${plan.class_count} classes`}
                </p>
              </div>
              <button
                onClick={() => handleDeactivate(plan.id)}
                className="h-7 px-2.5 rounded-md text-[12px] font-medium text-[var(--color-ink-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
        ))}
        {plans.length === 0 && (
          <p className="text-center text-[13px] text-[var(--color-ink-muted)] py-8">No plans created yet.</p>
        )}
      </div>
    </div>
  );
}
