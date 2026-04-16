"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { formatUtcTime } from "@/lib/utils";

export default function CheckInPage() {
  const { gymId, classId } = useParams();
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gymId) loadOccurrences();
  }, [gymId]);

  async function loadOccurrences() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const end = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      const data = await apiFetch(`/gyms/${gymId}/occurrences?start=${today}&end=${end}`);
      const filtered = (data || []).filter((o: any) => o.class_id === classId);
      setOccurrences(filtered);
      if (filtered.length > 0) setSelectedOccurrence(filtered[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn(signupId: string) {
    if (!selectedOccurrence) return;
    try {
      await apiFetch(`/occurrences/${selectedOccurrence.id}/check-in/${signupId}`, {
        method: "POST",
      });
      loadOccurrences();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <p className="text-gray-600">Loading...</p>;

  return (
    <div className="max-w-lg">
      <BackButton className="mb-3" />
      <h1 className="text-3xl font-bold mb-4">Check-in</h1>

      {occurrences.length === 0 ? (
        <p className="text-gray-600 text-center py-6">No upcoming occurrences for this class.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-1">
            <label className="text-sm font-medium">Select Session</label>
            <select
              value={selectedOccurrence?.id || ""}
              onChange={(e) =>
                setSelectedOccurrence(occurrences.find((o) => o.id === e.target.value))
              }
              className="h-10 rounded-md border border-gray-300 px-3 text-sm bg-white"
            >
              {occurrences.map((occ) => (
                <option key={occ.id} value={occ.id}>
                  {new Date(occ.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at {formatUtcTime(occ.start_time, occ.date)}
                </option>
              ))}
            </select>
          </div>

          {selectedOccurrence && (
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">
                Signups ({selectedOccurrence.signups?.length || 0})
              </h3>
              {selectedOccurrence.signups?.length === 0 ? (
                <p className="text-center text-gray-600 py-6">No signups yet.</p>
              ) : (
                <div>
                  {selectedOccurrence.signups?.map((signup: any, index: number) => (
                    <div key={signup.id}>
                      {index > 0 && <div className="border-t border-gray-200 my-2" />}
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-700">
                              {signup.profile?.first_name?.[0]}
                              {signup.profile?.last_name?.[0]}
                            </span>
                          </div>
                          <span className="text-sm">
                            {signup.profile?.first_name} {signup.profile?.last_name}
                          </span>
                        </div>
                        {signup.checked_in ? (
                          <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                            Checked In
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCheckIn(signup.id)}
                            className="h-8 px-3 rounded bg-primary text-white text-sm font-medium hover:bg-primary/90"
                          >
                            Check In
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
