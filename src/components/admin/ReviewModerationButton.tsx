"use client";

import { useRouter } from "next/navigation";

export function ReviewModerationButton({ reviewId, status }: { reviewId: string; status: "approved" | "rejected" }) {
  const router = useRouter();
  async function moderate() {
    const response = await fetch(`/api/admin/reviews/${reviewId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) router.refresh();
  }
  return <button type="button" onClick={moderate} className={`rounded-full px-3 py-2 text-xs font-bold ${status === "approved" ? "bg-[#0B1D3A] text-white" : "border border-red-200 text-red-700"}`}>{status}</button>;
}
