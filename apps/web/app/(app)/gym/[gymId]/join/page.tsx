"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";

export default function JoinGymPage() {
  const { gymId } = useParams();
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (gymId) {
      apiFetch(`/gyms/${gymId}/plans`)
        .then(setPlans)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [gymId]);

  async function handleJoin(planId?: string) {
    setJoining(true);
    setError("");
    try {
      await apiFetch(`/gyms/${gymId}/join`, {
        method: "POST",
        body: JSON.stringify({ plan_id: planId || null }),
      });
      router.push(`/gym/${gymId}`);
    } catch (err: any) {
      setError(err.message);
      setJoining(false);
    }
  }

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  if (loading) return <p className="text-gray-600">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <BackButton href={`/gym/${gymId}`} label="Gym" className="mb-3" />
      <h1 className="text-2xl font-bold mb-5">Membership Plans</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-md mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="border border-gray-200 rounded-xl p-6">
          <div className="flex flex-col items-center py-6">
            <p className="text-gray-600 mb-4">No plans available yet.</p>
            <button
              onClick={() => handleJoin()}
              disabled={joining}
              className="h-10 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
            >
              {joining ? "Joining..." : "Join without a plan"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <h3 className="text-base font-semibold">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-1 rounded bg-gray-100 text-xs">{formatPrice(plan.price_cents)}</span>
                    {plan.billing_period && (
                      <span className="px-2 py-1 rounded border border-gray-200 text-xs">/ {plan.billing_period}</span>
                    )}
                    {plan.class_count && (
                      <span className="px-2 py-1 rounded border border-gray-200 text-xs">{plan.class_count} classes</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleJoin(plan.id)}
                  disabled={joining}
                  className="h-10 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
                >
                  {joining ? "Joining..." : "Select"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
