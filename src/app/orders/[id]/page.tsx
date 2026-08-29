import { isAppError } from "@/lib/errors";
import { OrderService } from "@/services/OrderService";
import { DownloadButton } from "@/components/account/DownloadButton";
import { DIGITAL_PRODUCT_TYPES } from "@/constants/product";
import type { Order, OrderItem, Address } from "@/types/domain";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Pending",
  processing: "Processing",
  fulfilled: "Fulfilled",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function formatMoney(amountMinor: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-PK").format(amountMinor / 100)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}

function AddressBlock({ label, address }: { label: string; address?: Address }) {
  if (!address) return null;
  return (
    <div className="rounded-2xl border bg-[#f5f7f3] p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-[#668084]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#103d42]">{address.fullName}</p>
      <p className="text-sm leading-6 text-[#6b7f82]">
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

  let order: Order;
  try {
    order = await OrderService.getForCurrentViewer(id);
  } catch (err) {
    if (isAppError(err)) {
      return (
        <main className="min-h-screen bg-[#f3f6f1] px-5 py-14 text-[#103d42]">
          <div className="mx-auto max-w-2xl rounded-[2rem] border bg-white p-10 text-center">
            <h1 className="display-font text-3xl">Order not found.</h1>
            <a href="/account" className="mt-6 inline-flex rounded-full bg-[#103d42] px-5 py-3 text-sm font-bold text-white">
              Back to your orders
            </a>
          </div>
        </main>
      );
    }
    throw err;
  }

  // Never leak another user's order — render the same not-found state.
  const isPaid = order.paymentStatus === "paid";
  const entitlements = isPaid ? await OrderService.getEntitlementsForOrder(order.id, order.userId) : [];
  const entitlementByItem = new Map(entitlements.map((e) => [e.orderItemId, e.entitlementId]));

  const isDigitalItem = (item: OrderItem) => DIGITAL_PRODUCT_TYPES.includes(item.productType);

  return (
    <main className="min-h-screen bg-[#f3f6f1] px-5 py-10 text-[#103d42] sm:py-14">
      <div className="mx-auto max-w-4xl">
        <a href="/account" className="text-sm font-bold text-[#14777a]">
          ← Back to your orders
        </a>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Order</p>
            <h1 className="display-font mt-2 text-4xl text-[#103d42] sm:text-5xl">{order.orderNumber}</h1>
            <p className="mt-2 text-sm text-[#6b7f82]">Placed {formatDate(order.createdAt)}</p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-[#edf3ef] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#14777a]">
            {STATUS_LABEL[order.status]}
          </span>
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] border bg-white shadow-[0_25px_70px_rgba(16,61,66,.06)]">
          <div className="divide-y">
            {order.items.map((item) => {
              const entitlementId = entitlementByItem.get(item.id);
              const canDownload = isPaid && isDigitalItem(item) && entitlementId;
              return (
                <div key={item.id} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-[#103d42]">{item.productName}</p>
                    {item.variantName && <p className="text-sm text-[#6b7f82]">{item.variantName}</p>}
                    <p className="mt-1 text-sm text-[#6b7f82]">
                      {item.quantity} × {formatMoney(item.unitPrice.amountMinor, item.unitPrice.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-[#103d42]">{formatMoney(item.lineTotal.amountMinor, item.lineTotal.currency)}</span>
                    {canDownload && <DownloadButton orderId={order.id} entitlementId={entitlementId} />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 border-t bg-[#f5f7f3] p-6">
            <div className="flex justify-between text-sm text-[#6b7f82]">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal.amountMinor, order.subtotal.currency)}</span>
            </div>
            {order.discount.amountMinor > 0 && (
              <div className="flex justify-between text-sm text-[#6b7f82]">
                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                <span>-{formatMoney(order.discount.amountMinor, order.discount.currency)}</span>
              </div>
            )}
            {order.shipping.amountMinor > 0 && (
              <div className="flex justify-between text-sm text-[#6b7f82]">
                <span>Shipping</span>
                <span>{formatMoney(order.shipping.amountMinor, order.shipping.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-bold text-[#103d42]">
              <span>Total</span>
              <span>{formatMoney(order.total.amountMinor, order.total.currency)}</span>
            </div>
          </div>
        </div>

        {(order.shippingAddress || order.billingAddress) && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <AddressBlock label="Shipping address" address={order.shippingAddress} />
            <AddressBlock label="Billing address" address={order.billingAddress} />
          </div>
        )}
      </div>
    </main>
  );
}
