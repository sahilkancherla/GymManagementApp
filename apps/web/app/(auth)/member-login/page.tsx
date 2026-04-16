import Link from "next/link";
import { APP_NAME } from "@acuo/shared";

export default function MemberLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-gray-200 rounded-xl p-6 bg-white shadow-sm text-center">
        <h2 className="text-2xl font-bold mb-2">Member sign in</h2>
        <p className="text-sm text-gray-600 mb-6">
          The member experience is coming soon. For now, please use the {APP_NAME} mobile
          app to sign in, browse classes, and track your workouts.
        </p>

        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 mb-6">
          <p className="text-sm text-gray-700 font-medium">
            Member web sign-in is under construction.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Check back soon — we're building this experience out.
          </p>
        </div>

        <p className="text-sm text-gray-600">
          Are you a gym admin?{" "}
          <Link href="/login" className="font-semibold text-gray-900 hover:underline">
            Admin sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
