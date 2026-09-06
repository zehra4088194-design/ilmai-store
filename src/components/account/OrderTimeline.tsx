import { Check, Package, Truck, Wallet, X } from "lucide-react";
import type { Order } from "@/types/domain";

type Step = { label: string; date?: string; state: "done" | "current" | "upcoming" | "failed" };

function formatDate(iso?: string) {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString("en-PK", { month: "short", day: "numeric" });
}

/**
 * A visual step tracker for an order's lifecycle — the order page used to
 * only list raw status/fulfillment/tracking fields as flat text rows, with
 * no at-a-glance sense of where the order actually is. Branches into a
 * shipping track (placed → paid → shipped → delivered) for orders with a
 * physical item, or a simpler digital track (placed → paid → access
 * ready) otherwise, with cancelled/refunded shown as a distinct end state.
 */
export function OrderTimeline({ order }: { order: Order }) {
  const hasPhysical = order.items.some((item) => ["physical", "book"].includes(item.productType));
  const isTerminalBad = order.status === "cancelled" || order.status === "refunded";

  const steps: Step[] = [];
  steps.push({ label: "Order placed", date: formatDate(order.createdAt), state: "done" });

  if (isTerminalBad) {
    steps.push({ label: order.status === "cancelled" ? "Cancelled" : "Refunded", state: "failed" });
  } else {
    steps.push({
      label: "Payment confirmed",
      state: order.paymentStatus === "paid" ? "done" : order.paymentStatus === "failed" ? "failed" : "current",
    });
    if (hasPhysical) {
      steps.push({ label: "Shipped", date: formatDate(order.shippedAt), state: order.shippedAt ? "done" : order.paymentStatus === "paid" ? "current" : "upcoming" });
      steps.push({ label: "Delivered", date: formatDate(order.deliveredAt), state: order.deliveredAt ? "done" : order.shippedAt ? "current" : "upcoming" });
    } else {
      steps.push({ label: "Access ready", state: order.fulfillmentStatus === "fulfilled" ? "done" : order.paymentStatus === "paid" ? "current" : "upcoming" });
    }
  }

  const icons = [Package, Wallet, Truck, Check];

  return (
    <div className="rounded-2xl border bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-[#0F766E]">Order progress</p>
      <div className="mt-4 flex items-start gap-1">
        {steps.map((step, i) => {
          const Icon = step.state === "failed" ? X : (icons[i] ?? Check);
          const circleClass = step.state === "done" ? "bg-[#0F766E] text-white" : step.state === "current" ? "border-2 border-[#0F766E] text-[#0F766E]" : step.state === "failed" ? "bg-red-600 text-white" : "border-2 border-[#E2E8F0] text-[#94A3B8]";
          return (
            <div key={step.label} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                {i > 0 && <span className={`h-0.5 flex-1 ${step.state === "upcoming" ? "bg-[#E2E8F0]" : "bg-[#0F766E]"}`} />}
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${circleClass}`}>
                  <Icon size={14} />
                </span>
                {i < steps.length - 1 && <span className={`h-0.5 flex-1 ${steps[i + 1]?.state === "upcoming" ? "bg-[#E2E8F0]" : "bg-[#0F766E]"}`} />}
              </div>
              <p className={`mt-2 text-[11px] font-bold leading-tight ${step.state === "upcoming" ? "text-[#94A3B8]" : "text-[#0B1D3A]"}`}>{step.label}</p>
              {step.date && <p className="mt-0.5 text-[10px] text-[#64748B]">{step.date}</p>}
            </div>
          );
        })}
      </div>
      {order.shippingCarrier && order.trackingNumber && (
        <p className="mt-4 text-xs text-[#64748B]">Shipped via <span className="font-bold text-[#0B1D3A]">{order.shippingCarrier}</span> · tracking <span className="font-bold text-[#0B1D3A]">{order.trackingNumber}</span></p>
      )}
    </div>
  );
}
