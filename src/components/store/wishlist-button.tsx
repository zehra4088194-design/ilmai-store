"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

type Props = {
  productId: string;
  initialSaved: boolean;
  isLoggedIn: boolean;
  size?: number;
  /** Positioning/layout classes only — the saved/unsaved color is applied internally so it stays in sync with this button's own toggle state. */
  className?: string;
  savedColorClass?: string;
  unsavedColorClass?: string;
};

/**
 * The heart/wishlist toggle used on both the product grid card and the
 * product detail page. Actually persists (POST/DELETE /api/wishlist) for a
 * signed-in shopper — a guest is sent to log in instead of the click
 * silently doing nothing.
 */
export function WishlistButton({ productId, initialSaved, isLoggedIn, size = 13, className, savedColorClass = "text-[#E11D48]", unsavedColorClass = "text-[var(--navy)]" }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/store")}`);
      return;
    }
    if (pending) return;
    setPending(true);
    const next = !saved;
    setSaved(next); // optimistic
    try {
      const response = next
        ? await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) })
        : await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
      if (!response.ok) setSaved(!next); // revert on failure
    } catch {
      setSaved(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      onClick={toggle}
      className={`${className ?? ""} ${saved ? savedColorClass : unsavedColorClass}`}
    >
      <Heart size={size} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
