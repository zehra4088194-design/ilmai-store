import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Package } from "lucide-react";
import { requireUser } from "@/lib/auth/admin";
import { AuthenticationError } from "@/lib/errors";
import { OrderService } from "@/services/OrderService";
import type { Order } from "@/types/domain";

export const dynamic = "force-dynamic";

function money(m: { amountMinor: number; currency: string }) {
  return `${m.currency} ${new Intl.NumberFormat("en-PK").format(m.amountMinor / 100)}`;
}

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Pending",
  processing: "Processing",
  fulfilled: "Fulfilled",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default async function AccountPage() {
  let userId: string;
  let email: string | null;
  try {
    ({ userId, email } = await requireUser());
  } catch (err) {
    if (err instanceof AuthenticationError) redirect("/login?redirect=/account");
    throw err;
  }

  const orders = await OrderService.listForUser(userId);

  return (
    <main className="min-h-screen bg-[#F1F5F9] px-5 py-14 text-[#0B1D3A]">
      <div className="mx-auto max-w-4xl">
        <Link href="/store" className="text-sm font-bold text-[#2563EB]">
          ← Back to store
        </Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#2563EB]">My account</p>
            <h1 className="display-font mt-2 text-5xl leading-tight">Your orders.</h1>
            {email && <p className="mt-2 text-sm text-[#64748B]">Signed in as {email}</p>}
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="mt-10 rounded-[2rem] border bg-white p-10 text-center">
            <p className="display-font text-3xl">No orders yet.</p>
            <p className="mt-3 text-sm leading-6 text-[#64748B]">Everything you buy will show up here.</p>
            <Link href="/store" className="mt-6 inline-flex rounded-full bg-[#0B1D3A] px-5 py-3 text-sm font-bold text-white">
              Browse the store
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#2563EB]/25 text-[#0B1D3A]">
                    <Package size={20} strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="font-bold text-[#0B1D3A]">{order.orderNumber}</p>
                    <p className="mt-1 text-sm text-[#64748B]">
                      {new Date(order.createdAt).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })}
                      {" · "}
                      {order.items.length} item{order.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#2563EB]">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <span className="font-bold text-[#2563EB]">{money(order.total)}</span>
                  <ChevronRight size={18} className="text-[#64748B]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
