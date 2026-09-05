import { OrderService } from "@/services/OrderService";
import { ManualPaymentService } from "@/services/ManualPaymentService";
import { MarkPaidButton } from "@/components/admin/MarkPaidButton";
import { RejectPaymentButton } from "@/components/admin/RejectPaymentButton";
import { FulfillmentButton } from "@/components/admin/FulfillmentButton";
import { CancelOrderButton } from "@/components/admin/CancelOrderButton";
import { formatMoney } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await OrderService.adminList();
  const claims = await ManualPaymentService.adminClaims(orders.map((order) => order.id));
  return <main className="mx-auto max-w-6xl p-6 lg:p-10">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Commerce control</p>
    <h1 className="display-font mt-2 text-5xl">Orders</h1>
    <div className="mt-8 grid gap-4">
      {orders.map((order) => {
        const claim = claims.get(order.id);
        const isManualPending = order.paymentProvider === "jazzcash" && order.paymentStatus === "pending";
        return <article key={order.id} className="rounded-3xl border bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-bold">{order.orderNumber}</h2><p className="mt-1 text-sm text-[#64748B]">{order.customerEmail} · {new Date(order.createdAt).toLocaleDateString()}</p></div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-bold">
              <span className="rounded-full bg-[#DCFCE7] px-3 py-2">payment: {order.paymentStatus}{order.paymentProvider === "jazzcash" ? " (JazzCash)" : ""}</span>
              <span className="rounded-full bg-[#FFF3E8] px-3 py-2">fulfillment: {order.fulfillmentStatus}</span>
              {isManualPending && <MarkPaidButton orderId={order.id} />}
              {isManualPending && <RejectPaymentButton orderId={order.id} />}
              {order.paymentStatus === "paid" && order.items.some((item) => ["physical", "book"].includes(item.productType)) && order.fulfillmentStatus !== "fulfilled" && <FulfillmentButton orderId={order.id} />}
              {["pending", "processing"].includes(order.status) && <CancelOrderButton orderId={order.id} />}
            </div>
          </div>
          {claim && <div className="mt-4 rounded-2xl bg-[#F1F5F9] px-4 py-3 text-sm"><span className="font-bold">JazzCash claim:</span> {claim.status}{claim.transactionReference ? ` · transaction ${claim.transactionReference}` : " · proof not submitted"}{claim.customerNote ? ` · ${claim.customerNote}` : ""}{claim.proofStorageKey && <a className="ml-3 font-bold text-[#0F766E]" href={`/api/admin/orders/${order.id}/manual-payment/proof`} target="_blank" rel="noreferrer">View proof</a>}</div>}
          <div className="mt-5 border-t pt-4 text-sm">{order.items.map((item) => <div className="flex justify-between py-1" key={item.id}><span>{item.productName} × {item.quantity}</span><span>{formatMoney(item.lineTotal)}</span></div>)}{order.shipping.amountMinor > 0 && <div className="flex justify-between py-1 text-[#64748B]"><span>Delivery</span><span>{formatMoney(order.shipping)}</span></div>}<div className="mt-3 flex justify-between border-t pt-3 font-bold"><span>Total</span><span>{formatMoney(order.total)}</span></div></div>
        </article>;
      })}
      {!orders.length && <p className="rounded-3xl border bg-white p-10 text-center text-[#64748B]">No orders yet.</p>}
    </div>
  </main>;
}
