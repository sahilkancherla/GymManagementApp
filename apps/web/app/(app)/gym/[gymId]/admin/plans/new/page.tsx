"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

  if (loading) return <p className="text-gray-600">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <BackButton href={`/gym/${gymId}`} label="Gym" className="mb-3" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Manage Plans</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`h-9 px-3 rounded-md text-sm font-medium ${
            showForm
              ? "border border-gray-300 hover:bg-gray-50"
              : "bg-primary text-white hover:bg-primary/90"
          }`}
        >
          {showForm ? "Cancel" : "New Plan"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 border border-gray-200 rounded-xl">
          <h3 className="text-lg font-semibold mb-3">Create Plan</h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="plan-name" className="text-sm font-medium">Plan Name</label>
              <input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 rounded-md border border-gray-300 px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="plan-desc" className="text-sm font-medium">Description</label>
              <input
                id="plan-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-10 rounded-md border border-gray-300 px-3 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="plan-price" className="text-sm font-medium">Price ($)</label>
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
                  className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Billing Period</label>
                <select
                  value={form.billing_period || "none"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      billing_period: e.target.value === "none" ? null : e.target.value,
                    })
                  }
                  className="h-10 rounded-md border border-gray-300 px-3 text-sm bg-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="none">None (class pack)</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="plan-count" className="text-sm font-medium">Class Count (leave empty for unlimited)</label>
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
                className="h-10 rounded-md border border-gray-300 px-3 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
            >
              {saving ? "Creating..." : "Create Plan"}
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {plans.map((plan) => (
          <div key={plan.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">{plan.name}</h3>
                <p className="text-sm text-gray-600">
                  {formatPrice(plan.price_cents)}
                  {plan.billing_period && ` / ${plan.billing_period}`}
                  {plan.class_count && ` · ${plan.class_count} classes`}
                </p>
              </div>
              <button
                onClick={() => handleDeactivate(plan.id)}
                className="h-8 px-2 rounded text-sm text-gray-700 hover:bg-gray-100"
              >
                Deactivate
              </button>
            </div>
          </div>
        ))}
        {plans.length === 0 && (
          <p className="text-center text-gray-600 py-6">No plans created yet.</p>
        )}
      </div>
    </div>
  );
}
