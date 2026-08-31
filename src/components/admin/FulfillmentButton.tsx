"use client";

import { useRouter } from "next/navigation";

export function FulfillmentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  async function fulfill() {
    const response = await fetch(`/api/admin/orders/${orderId}/fulfillment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fulfillmentStatus: "fulfilled", delivered: true }) });
    if (response.ok) router.refresh();
  }
  return <button type="button" onClick={fulfill} className="rounded-full border px-3 py-2 text-xs font-bold text-[#2563EB]">Mark fulfilled</button>;
}
