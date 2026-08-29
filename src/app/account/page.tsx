import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/admin";
import { AuthenticationError } from "@/lib/errors";
import { OrderService } from "@/services/OrderService";
import { PackageOpen, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Order } from "@/types/domain";

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

export default async function AccountPage() {
  let userId: string;
  let email: string | null;
  try {
    const user = await requireUser();
    userId = user.userId;
    email = user.email;
  } catch (err) {
    if (err instanceof AuthenticationError) redirect("/login?redirect=/account");
    throw err;
  }

  const orders = await OrderService.listForUser(userId);

  return (
    <main className="min-h-screen bg-[#f3f6f1] px-5 py-10 text-[#103d42] sm:py-14">
      <div className="mx-auto max-w-5xl">
        <Link href="/store" className="text-sm font-bold text-[#14777a]">
          ← Back to store
        </Link>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Your account</p>
            <h1 className="display-font mt-2 text-4xl text-[#103d42] sm:text-5xl">Order history</h1>
            {email && <p className="mt-2 text-sm text-[#6b7f82]">Signed in as {email}</p>}
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="mt-10 rounded-[2rem] border bg-white p-10 text-center shadow-[0_25px_70px_rgba(16,61,66,.06)]">
            <PackageOpen className="mx-auto text-[#14777a]" size={40} strokeWidth={1.5} />
            <h2 className="display-font mt-5 text-3xl text-[#103d42]">No orders yet.</h2>
            <p className="mt-2 text-sm text-[#6b7f82]">Everything you buy from the shelf will show up here.</p>
            <Link
              href="/store"
              className="mt-6 inline-flex rounded-full bg-[#103d42] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#14777a]"
            >
              Browse the store
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {orders.map((order) => (
              <a
                key={order.id}
                href={`/orders/${order.id}`}
                className="group flex flex-col gap-4 rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="display-font text-xl text-[#103d42]">{order.orderNumber}</span>
                    <span className="rounded-full bg-[#edf3ef] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#14777a]">
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#6b7f82]">
                    {formatDate(order.createdAt)} · {order.items.length} item{order.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-[#103d42]">{formatMoney(order.total.amountMinor, order.total.currency)}</span>
                  <ChevronRight className="text-[#14777a] transition group-hover:translate-x-1" size={20} />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
