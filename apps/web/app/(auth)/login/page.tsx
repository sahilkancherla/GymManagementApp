"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { APP_NAME } from "@acuo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--color-bg-base)]">
      {/* Brand panel */}
      <aside className="hidden lg:flex relative flex-col justify-between p-10 bg-[var(--color-ink)] text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-fade opacity-[0.08] pointer-events-none" />
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[var(--color-accent)] opacity-20 blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-2.5">
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-[var(--color-ink)]">
            <span className="text-[14px] font-semibold tracking-tight">A</span>
            <span className="absolute -right-0.5 -bottom-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-ink)]" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight font-display">
            {APP_NAME}
          </span>
        </div>

        <div className="relative max-w-md">
          <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-white/50 mb-4">
            Operations Console
          </p>
          <h1 className="font-display text-[40px] leading-[1.05] font-semibold tracking-tight">
            Run every gym, schedule, and member from one clean workspace.
          </h1>
          <p className="mt-5 text-[14px] text-white/60 leading-relaxed max-w-sm">
            Acuo is the administrative layer for modern gym operators — built
            for owners, managers, and front-desk teams.
          </p>
        </div>

        <div className="relative flex items-center gap-3 text-[12px] text-white/50">
          <ShieldCheck size={14} strokeWidth={1.6} />
          <span>SOC 2-aligned infrastructure · Encrypted at rest</span>
        </div>
      </aside>

      {/* Form */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-accent-rich)] to-[var(--color-accent-deep)] text-white text-[13px] font-semibold">
              A
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              {APP_NAME}
            </span>
          </div>

          <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--color-accent)] mb-2">
            Administrator
          </p>
          <h2 className="font-display text-[28px] leading-tight font-semibold text-[var(--color-ink)]">
            Sign in to your workspace
          </h2>
          <p className="mt-2 text-[13.5px] text-[var(--color-ink-soft)]">
            Use the email associated with your gym account.
          </p>

          {error && (
            <div className="mt-6 border border-[#fecaca] bg-[var(--color-danger-soft)] text-[var(--color-danger)] rounded-md px-3 py-2.5 text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@gym.com"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              required
              hint={
                <Link
                  href="/register"
                  className="text-[12px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] no-underline"
                >
                  Reset
                </Link>
              }
            />

            <button
              type="submit"
              disabled={loading}
              className="group w-full h-11 mt-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] text-white text-[13.5px] font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors shadow-[var(--shadow-soft)]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Signing in
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight
                    size={14}
                    strokeWidth={2}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--color-rule)] space-y-2.5">
            <p className="text-[13px] text-[var(--color-ink-soft)]">
              New to Acuo?{" "}
              <Link
                href="/register"
                className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent-ink)] no-underline"
              >
                Create an account
              </Link>
            </p>
            <p className="text-[13px] text-[var(--color-ink-soft)]">
              Gym member?{" "}
              <Link
                href="/member-login"
                className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent-ink)] no-underline"
              >
                Member sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  placeholder,
  value,
  onChange,
  required,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id}
          className="text-[12px] font-medium text-[var(--color-ink)]"
        >
          {label}
        </label>
        {hint}
      </div>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-11 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10 transition-colors"
      />
    </div>
  );
}
