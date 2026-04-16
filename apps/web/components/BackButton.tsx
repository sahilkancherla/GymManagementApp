"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type BackButtonProps = {
  /** If provided, links to this href. Otherwise uses router.back(). */
  href?: string;
  /** Label shown next to the arrow. Defaults to "Back". */
  label?: string;
  /** Extra classes to append. */
  className?: string;
};

/**
 * Shared back-navigation control. Use `href` for a deterministic destination
 * (preferred — survives deep-link refreshes) or omit it to fall back to
 * browser history.
 */
export function BackButton({ href, label = "Back", className = "" }: BackButtonProps) {
  const router = useRouter();

  const base =
    "inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 no-underline -ml-1 px-1 py-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900";

  const content = (
    <>
      <span aria-hidden="true" className="text-base leading-none">
        ←
      </span>
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${base} ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`${base} ${className}`}
    >
      {content}
    </button>
  );
}
