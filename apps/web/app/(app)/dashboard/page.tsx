"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function DashboardPage() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/gyms")
      .then((data) => setGyms(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--color-accent)] mb-2">
            Overview
          </p>
          <h1 className="font-display text-[34px] leading-[1.05] font-semibold text-[var(--color-ink)]">
            Your gyms
          </h1>
          <p className="mt-2 text-[14px] text-[var(--color-ink-soft)] leading-relaxed">
            Manage facilities, staff, schedules, and memberships across every
            location you operate.
          </p>
        </div>
        <Link
          href="/gym/new"
          className="self-start md:self-auto inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors no-underline shadow-[var(--shadow-soft)]"
        >
          <Plus size={14} strokeWidth={2.25} />
          New gym
        </Link>
      </header>

      {/* Gyms list */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[13px] font-medium tracking-[0.08em] uppercase text-[var(--color-ink-soft)]">
            All locations
          </h2>
          {!loading && gyms.length > 0 && (
            <span className="text-[12px] tabular-nums text-[var(--color-ink-muted)]">
              {gyms.length} {gyms.length === 1 ? "gym" : "gyms"}
            </span>
          )}
        </div>

        {loading ? (
          <LoadingGrid />
        ) : gyms.length === 0 ? (
          <div className="relative border border-dashed border-[var(--color-rule-strong)] rounded-xl bg-[var(--color-bg-sunken)] p-14 flex flex-col items-center justify-center text-center overflow-hidden">
            <div className="absolute inset-0 bg-grid-fade opacity-60 pointer-events-none" />
            <div className="relative">
              <div className="mx-auto h-10 w-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-rule)] flex items-center justify-center mb-4 shadow-[var(--shadow-soft)]">
                <Building2
                  size={18}
                  strokeWidth={1.6}
                  className="text-[var(--color-ink-soft)]"
                />
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--color-ink)] mb-1">
                No gyms yet
              </h3>
              <p className="text-[13px] text-[var(--color-ink-soft)] mb-5 max-w-xs">
                Create your first location to start managing members, classes,
                and programs.
              </p>
              <Link
                href="/gym/new"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors no-underline"
              >
                <Plus size={14} strokeWidth={2.25} />
                Create gym
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {gyms.map((item) => {
              const roles: string[] =
                item.roles || (item.role ? [item.role] : []);
              const isActive = item.status === "active";
              return (
                <li key={item.gym?.id || item.id}>
                  <Link
                    href={`/gym/${item.gym?.id}`}
                    className="group relative block border border-[var(--color-rule)] rounded-xl p-5 bg-[var(--color-bg-card)] hover:border-[var(--color-ink-faint)] hover:shadow-[var(--shadow-lifted)] transition-all duration-200 no-underline text-[var(--color-ink)] overflow-hidden"
                  >
                    <div className="flex items-start gap-3 mb-5">
                      <div className="w-11 h-11 rounded-lg bg-[var(--color-bg-soft)] ring-1 ring-[var(--color-rule)] flex items-center justify-center overflow-hidden shrink-0">
                        {item.gym?.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.gym.logo_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[15px] font-semibold text-[var(--color-ink-soft)]">
                            {item.gym?.name?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold leading-tight truncate text-[var(--color-ink)]">
                          {item.gym?.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive
                                ? "bg-[var(--color-accent)]"
                                : "bg-[var(--color-ink-faint)]"
                            }`}
                          />
                          <span className="text-[11.5px] capitalize text-[var(--color-ink-soft)]">
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight
                        size={15}
                        strokeWidth={1.75}
                        className="text-[var(--color-ink-faint)] group-hover:text-[var(--color-accent)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {roles.length > 0 ? (
                        roles.map((r) => (
                          <span
                            key={r}
                            className="inline-flex items-center px-2 h-5 rounded-full text-[10.5px] font-medium capitalize tracking-wide bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] border border-[var(--color-rule)]"
                          >
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-[var(--color-ink-muted)]">
                          No roles assigned
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function LoadingGrid() {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="border border-[var(--color-rule)] rounded-xl p-5 bg-[var(--color-bg-card)] animate-pulse"
        >
          <div className="flex items-start gap-3 mb-5">
            <div className="w-11 h-11 rounded-lg bg-[var(--color-bg-soft)]" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-2/3 rounded bg-[var(--color-bg-soft)]" />
              <div className="h-2.5 w-1/3 rounded bg-[var(--color-bg-soft)]" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="h-5 w-14 rounded-full bg-[var(--color-bg-soft)]" />
            <div className="h-5 w-14 rounded-full bg-[var(--color-bg-soft)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
