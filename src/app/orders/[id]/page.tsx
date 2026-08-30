import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/admin";
import { AuthenticationError, NotFoundError } from "@/lib/errors";
import { OrderService } from "@/services/OrderService";
import type { OrderItem } from "@/types/domain";
import { DownloadButton } from "./download-button";

export const dynamic = "force-dynamic";

const DIGITAL_TYPES = new Set(["digital", "course", "notes", "test_series"]);

function money(m: { amountMinor: number; currency: string }) {
  return `${m.currency} ${new Intl.NumberFormat("en-PK").format(m.amountMinor / 100)}`;
}

function AddressBlock({ label, address }: { label: string; address?: { fullName: string; phone: string; line1: string; line2?: string; city: string; state?: string; postalCode?: string; country: string } }) {
  if (!address) return null;
  return (
    <div className="rounded-2xl border bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-[#14777a]">{label}</p>
      <p className="mt-2 text-sm font-bold text-[#103d42]">{address.fullName}</p>
      <p className="mt-1 text-sm leading-6 text-[#6b7f82]">
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ""}
        <br />
        {address.city}
        {address.state ? `, ${address.state}` : ""} {address.postalCode ?? ""}
        <br />
        {address.country}
        <br />
        {address.phone}
      </p>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let userId: string;
  try {
    ({ userId } = await requireUser());
  } catch (err) {
    if (err instanceof AuthenticationError) redirect(`/login?redirect=/orders/${id}`);
    throw err;
  }

  let order;
  try {
    order = await OrderService.getById(id);
  } catch (err) {
    if (err instanceof NotFoundError) return <OrderNotFound />;
    throw err;
  }

  if (order.userId !== userId) return <OrderNotFound />;

  const entitlements = order.paymentStatus === "paid" ? await OrderService.getEntitlementsForOrder(order.id, userId) : [];
  const entitlementByItem = new Map(entitlements.map((e) => [e.orderItemId, e.entitlementId]));

  return (
    <main className="min-h-screen bg-[#f3f6f1] px-5 py-14 text-[#103d42]">
      <div className="mx-auto max-w-4xl">
        <Link href="/account" className="text-sm font-bold text-[#14777a]">
          ← Back to your orders
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Order {order.orderNumber}</p>
            <h1 className="display-font mt-2 text-4xl leading-tight sm:text-5xl">Order details.</h1>
            <p className="mt-2 text-sm text-[#6b7f82]">
              Placed {new Date(order.createdAt).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })}
            </p>
          </div>
          <span className="rounded-full bg-[#edf3ef] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#14777a]">
            {order.status}
          </span>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-[2rem] border bg-white p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-[#14777a]">Items</p>
            <div className="mt-4 grid gap-4">
              {order.items.map((item: OrderItem) => {
                const entitlementId = entitlementByItem.get(item.id);
                const canDownload = DIGITAL_TYPES.has(item.productType) && order.paymentStatus === "paid" && entitlementId;
                return (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1ec] pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-[#103d42]">{item.productName}</p>
                      <p className="mt-1 text-sm text-[#789094]">
                        {item.variantName ? `${item.variantName} · ` : ""}Qty {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-[#14777a]">{money(item.lineTotal)}</span>
                      {canDownload && <DownloadButton orderId={order.id} entitlementId={entitlementId!} />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 grid gap-2 border-t border-[#eef1ec] pt-6 text-sm">
              <div className="flex justify-between text-[#6b7f82]"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
              {order.discount.amountMinor > 0 && <div className="flex justify-between text-[#6b7f82]"><span>Discount</span><span>-{money(order.discount)}</span></div>}
              {order.shipping.amountMinor > 0 && <div className="flex justify-between text-[#6b7f82]"><span>Shipping</span><span>{money(order.shipping)}</span></div>}
              <div className="flex justify-between text-base font-bold text-[#103d42]"><span>Total</span><span>{money(order.total)}</span></div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[#14777a]">Status</p>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between"><span className="text-[#789094]">Payment</span><span className="font-semibold text-[#103d42]">{order.paymentStatus}</span></div>
                <div className="flex justify-between"><span className="text-[#789094]">Fulfillment</span><span className="font-semibold text-[#103d42]">{order.fulfillmentStatus}</span></div>
                {order.trackingNumber && <div className="flex justify-between"><span className="text-[#789094]">Tracking</span><span className="font-semibold text-[#103d42]">{order.trackingNumber}</span></div>}
              </div>
            </div>
            <AddressBlock label="Shipping address" address={order.shippingAddress} />
            <AddressBlock label="Billing address" address={order.billingAddress} />
          </div>
        </div>
      </div>
    </main>
  );
}

function OrderNotFound() {
  return (
    <main className="min-h-screen bg-[#f3f6f1] px-5 py-14 text-[#103d42]">
      <div className="mx-auto max-w-md rounded-[2rem] border bg-white p-10 text-center">
        <p className="display-font text-3xl">Order not found.</p>
        <p className="mt-3 text-sm leading-6 text-[#6b7f82]">We couldn&apos;t find that order on your account.</p>
        <Link href="/account" className="mt-6 inline-flex rounded-full bg-[#103d42] px-5 py-3 text-sm font-bold text-white">
          Back to your orders
        </Link>
      </div>
    </main>
  );
}
