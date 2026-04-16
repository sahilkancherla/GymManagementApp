"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/* -------------------- Status toggle -------------------- */

export function StatusToggle({
  active,
  disabled,
  onChange,
}: {
  active: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        disabled={disabled}
        onClick={() => onChange(!active)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          active ? "bg-green-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            active ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
      <span
        className={`text-xs font-medium ${
          active ? "text-green-700" : "text-gray-500"
        }`}
      >
        {active ? "Active" : "Inactive"}
      </span>
    </div>
  );
}

/* -------------------- Program enrollments -------------------- */

export function MemberProgramEnrollments({
  gymId,
  userId,
  onChanged,
}: {
  gymId: string;
  userId: string;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await apiFetch(
        `/gyms/${gymId}/members/${userId}/program-enrollments`,
      );
      setItems(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load enrollments");
    }
  };

  useEffect(() => {
    setItems(null);
    setError(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId, userId]);

  async function enroll(programId: string) {
    setBusy(programId);
    setError(null);
    try {
      await apiFetch(`/gyms/${gymId}/programs/${programId}/enrollments`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, status: "active" }),
      });
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || "Failed to enroll");
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(programId: string, status: "active" | "inactive") {
    setBusy(programId);
    setError(null);
    try {
      await apiFetch(
        `/gyms/${gymId}/programs/${programId}/enrollments/${userId}`,
        { method: "PUT", body: JSON.stringify({ status }) },
      );
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || "Failed to update status");
    } finally {
      setBusy(null);
    }
  }

  async function remove(programId: string) {
    if (!confirm("Remove this program enrollment?")) return;
    setBusy(programId);
    setError(null);
    try {
      await apiFetch(
        `/gyms/${gymId}/programs/${programId}/enrollments/${userId}`,
        { method: "DELETE" },
      );
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || "Failed to remove");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
        Program enrollments
      </div>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2 mb-2">
          {error}
        </div>
      )}
      {items === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">
          This gym has no programs yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((row: any) => {
            const enrolled = !!row.enrollment;
            const status: "active" | "inactive" =
              row.enrollment?.status || "active";
            const isBusy = busy === row.program.id;
            return (
              <li
                key={row.program.id}
                className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {row.program.name}
                  </div>
                  {enrolled && (
                    <div className="text-xs text-gray-500">
                      Enrolled{" "}
                      {row.enrollment.created_at
                        ? new Date(
                            row.enrollment.created_at,
                          ).toLocaleDateString()
                        : ""}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {enrolled ? (
                    <>
                      <StatusToggle
                        active={status === "active"}
                        disabled={isBusy}
                        onChange={(next) =>
                          setStatus(row.program.id, next ? "active" : "inactive")
                        }
                      />
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => remove(row.program.id)}
                        className="h-8 px-2 rounded-md text-xs text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => enroll(row.program.id)}
                      className="h-8 px-3 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-60"
                    >
                      Enroll
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
