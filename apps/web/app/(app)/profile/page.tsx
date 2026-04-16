"use client";

import { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch("/profile")
      .then((data) => {
        setProfile(data);
        setFirstName(data.first_name);
        setLastName(data.last_name);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const data = await apiFetch("/profile", {
        method: "PUT",
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      });
      setProfile(data);
      setMessage("Profile updated successfully");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const formData = new FormData();
      formData.append("avatar", file);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${API_URL}/api/profile/avatar`, {
        method: "POST",
        headers: {
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Upload failed");
      }

      const data = await res.json();
      setProfile(data);
      setMessage("Avatar updated successfully");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p className="text-gray-600">Loading...</p>;

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-gray-600 mt-1">Manage your account settings</p>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-md mb-4">
          <p className="text-sm text-blue-800">{message}</p>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl p-6 mb-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Photo</h2>
          <p className="text-sm text-gray-600">Your profile picture</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-xl text-gray-700">
                {firstName?.[0]?.toUpperCase()}
                {lastName?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center h-9 px-3 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-70"
            >
              {uploading ? "Uploading..." : "Change photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Personal Info</h2>
          <p className="text-sm text-gray-600">Update your name</p>
        </div>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="firstName" className="text-sm font-medium">First Name</label>
            <input
              id="firstName"
              className="h-11 rounded-md border border-gray-300 px-3 text-sm"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="lastName" className="text-sm font-medium">Last Name</label>
            <input
              id="lastName"
              className="h-11 rounded-md border border-gray-300 px-3 text-sm"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="border-t border-gray-200" />
          <button
            type="submit"
            disabled={saving}
            className="self-start h-11 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
