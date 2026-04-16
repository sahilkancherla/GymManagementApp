"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Member login is now handled by the unified login page's role toggle.
// Redirect anyone who hits this URL directly.
export default function MemberLoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}
