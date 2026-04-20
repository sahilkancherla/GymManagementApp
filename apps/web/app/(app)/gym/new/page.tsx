"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";

export default function NewGymPage() {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const gym = await apiFetch("/gyms", {
        method: "POST",
        body: JSON.stringify({
          name,
          contact_email: contactEmail.trim() || null,
        }),
      });
      router.push(`/gym/${gym.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <BackButton href="/dashboard" label="Dashboard" className="mb-3" />
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight leading-tight text-[var(--color-ink)]">Create a Gym</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-md mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="border border-[var(--color-rule)] rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Gym Details</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="gym-name" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Gym Name</label>
            <input
              id="gym-name"
              className="h-11 rounded-md border border-[var(--color-rule-strong)] px-3 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="contact-email" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Contact Email <span className="normal-case tracking-normal text-[var(--color-ink-faint)]">(optional)</span></label>
            <input
              id="contact-email"
              type="email"
              className="h-11 rounded-md border border-[var(--color-rule-strong)] px-3 text-sm"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="gym@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="self-start h-11 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-70"
          >
            {loading ? "Creating..." : "Create Gym"}
          </button>
        </form>
      </div>
    </div>
  );
}
