import { redirect } from "next/navigation";

/**
 * /orders (no id) is linked from the header/footer as "Track order" — the
 * actual order-history list lives at /account (which also redirects to
 * /login when signed out). This route exists purely so that link doesn't
 * 404; the real page is /account.
 */
export default function OrdersIndexPage() {
  redirect("/account");
}
