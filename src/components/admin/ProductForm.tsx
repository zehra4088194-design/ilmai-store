"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PRODUCT_TYPES, PRODUCT_STATUSES, PHYSICAL_PRODUCT_TYPES } from "@/constants/product";
import { SUPPORTED_CURRENCIES } from "@/constants/order";
import type { Product } from "@/types/domain";

type VariantForm = {
  sku: string;
  name: string;
  priceRupees: string;
  currency: (typeof SUPPORTED_CURRENCIES)[number];
  isDefault: boolean;
  requiresShipping: boolean;
  stockQuantity: string;
  lowStockThreshold: string;
};

function emptyVariant(isDefault: boolean, currency: (typeof SUPPORTED_CURRENCIES)[number]): VariantForm {
  return { sku: "", name: "", priceRupees: "", currency, isDefault, requiresShipping: false, stockQuantity: "", lowStockThreshold: "5" };
}

function toVariantForm(product: Product): VariantForm[] {
  return product.variants.map((v) => ({
    sku: v.sku,
    name: v.name,
    priceRupees: (v.price.amountMinor / 100).toString(),
    currency: v.price.currency as (typeof SUPPORTED_CURRENCIES)[number],
    isDefault: v.isDefault,
    requiresShipping: v.requiresShipping,
    stockQuantity: v.stockQuantity !== undefined ? v.stockQuantity.toString() : "",
    lowStockThreshold: v.lowStockThreshold !== undefined ? v.lowStockThreshold.toString() : "5",
  }));
}

type Props = ({ mode: "create" } | { mode: "edit"; product: Product }) & { role?: "admin" | "seller" };

/** Plain-language "what this field does + where it shows up" note under a
 * field's label — every field on this form carries one so admin/seller
 * never have to guess what an English heading means in practice. */
function Hint({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-[#64748B]">{children}</span>;
}

export function ProductForm(props: Props) {
  const router = useRouter();
  const role = props.role ?? "admin";
  const apiBase = role === "seller" ? "/api/seller/products" : "/api/admin/products";
  const basePath = role === "seller" ? "/seller/products" : "/admin/products";
  const initial = props.mode === "edit" ? props.product : null;

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [productType, setProductType] = useState<(typeof PRODUCT_TYPES)[number]>(initial?.productType ?? "digital");
  const [status, setStatus] = useState<(typeof PRODUCT_STATUSES)[number]>(initial?.status ?? "draft");
  const [priceRupees, setPriceRupees] = useState(initial ? (initial.basePrice.amountMinor / 100).toString() : "");
  const [currency, setCurrency] = useState<(typeof SUPPORTED_CURRENCIES)[number]>(
    (initial?.basePrice.currency as (typeof SUPPORTED_CURRENCIES)[number]) ?? "PKR",
  );
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [compareAtRupees, setCompareAtRupees] = useState(
    initial?.compareAtPrice ? (initial.compareAtPrice.amountMinor / 100).toString() : "",
  );
  const [freeDelivery, setFreeDelivery] = useState((initial?.deliveryFee?.amountMinor ?? 0) === 0);
  const [deliveryFeeRupees, setDeliveryFeeRupees] = useState(
    initial?.deliveryFee?.amountMinor ? (initial.deliveryFee.amountMinor / 100).toString() : "",
  );
  const isPhysical = PHYSICAL_PRODUCT_TYPES.includes(productType);
  const [variants, setVariants] = useState<VariantForm[]>(
    initial ? toVariantForm(initial) : [emptyVariant(true, "PKR")],
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateVariant(index: number, patch: Partial<VariantForm>) {
    setVariants((current) => current.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function addVariant() {
    setVariants((current) => [...current, emptyVariant(current.length === 0, currency)]);
  }

  function removeVariant(index: number) {
    setVariants((current) => current.filter((_, i) => i !== index));
  }

  function markDefault(index: number) {
    setVariants((current) => current.map((v, i) => ({ ...v, isDefault: i === index })));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        slug,
        title,
        description: description || undefined,
        productType,
        status,
        basePriceMinor: Math.round(Number(priceRupees) * 100),
        currency,
        compareAtPriceMinor: compareAtRupees ? Math.round(Number(compareAtRupees) * 100) : null,
        deliveryFeeMinor: isPhysical && !freeDelivery && deliveryFeeRupees ? Math.round(Number(deliveryFeeRupees) * 100) : 0,
        isFeatured,
        categoryIds: [] as string[],
        variants: variants.map((v) => ({
          sku: v.sku,
          name: v.name,
          priceMinor: Math.round(Number(v.priceRupees) * 100),
          currency: v.currency,
          isDefault: v.isDefault,
          requiresShipping: v.requiresShipping,
          stockQuantity: v.requiresShipping ? Math.max(0, Math.round(Number(v.stockQuantity) || 0)) : undefined,
          lowStockThreshold: v.requiresShipping ? Math.max(0, Math.round(Number(v.lowStockThreshold) || 0)) : undefined,
        })),
      };

      const url = props.mode === "edit" ? `${apiBase}/${props.product.id}` : apiBase;
      const method = props.mode === "edit" ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Product could not be saved.");
        return;
      }
      if (props.mode === "create") {
        const created = (await response.json()) as { id: string };
        router.push(`${basePath}/${created.id}`);
      } else {
        router.push(basePath);
      }
      router.refresh();
    } catch {
      setError("Product could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteProduct() {
    if (props.mode !== "edit") return;
    if (!confirm(`Delete "${props.product.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/${props.product.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Product could not be deleted.");
        return;
      }
      router.push(basePath);
      router.refresh();
    } catch {
      setError("Product could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 max-w-3xl">
      <div className="rounded-3xl border bg-white p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">
            Title <Hint>Product ka naam — store listing, product page aur order/cart me yehi naam customer ko dikhega.</Hint>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#0F766E]" />
          </label>
          <label className="text-sm font-bold">
            Slug (page link) <Hint>Product page ka URL — jaise &quot;exam-notes&quot; likhne se link banega yoursite.com/store/exam-notes. Sirf chhote letters, numbers aur &quot;-&quot; use karein.</Hint>
            <input
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="exam-notes"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title='Sirf chhote letters, numbers aur "-" — jaise exam-notes-2. Bade letters, space ya koi aur symbol allowed nahi.'
              className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#0F766E]"
            />
          </label>
          <label className="text-sm font-bold sm:col-span-2">
            Description <Hint>Product page par title ke neeche detail wala paragraph — customer yehi padh kar samajhta hai product me kya milega.</Hint>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#0F766E]" />
          </label>
          <label className="text-sm font-bold">
            Product type <Hint>Yeh product kis category ka hai (digital, physical, course, book, waghera) — store ke filters aur badge (jaise &quot;Digital&quot; ya &quot;Instant access&quot;) isi se decide hote hain.</Hint>
            <select value={productType} onChange={(e) => setProductType(e.target.value as (typeof PRODUCT_TYPES)[number])} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#0F766E]">
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {role === "admin" && (
            <label className="text-sm font-bold">
              Status <Hint>Draft = sirf aapko dikhega, kisi customer ko nahi. Published = live store pe sabko dikhega. Archived = store se hat jayega.</Hint>
              <select value={status} onChange={(e) => setStatus(e.target.value as (typeof PRODUCT_STATUSES)[number])} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#0F766E]">
                {PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}
          <label className="text-sm font-bold">
            Price <Hint>Asli bikri wali price (rupees me likhein, chahe currency PKR ho ya USD) — yehi price product card, product page aur checkout par customer ko dikhti hai.</Hint>
            <input required type="number" min="0" step="0.01" value={priceRupees} onChange={(e) => setPriceRupees(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#0F766E]" />
          </label>
          <label className="text-sm font-bold">
            Currency <Hint>Is price ki currency. PKR ho to &quot;PKR 500&quot; aur USD ho to &quot;$4&quot; is tarah har jagah (store, cart, checkout) dikhta hai.</Hint>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as (typeof SUPPORTED_CURRENCIES)[number])} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#0F766E]">
              {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">
            Compare-at price (optional) <Hint>Yahan ek zyada purani/badi price daalein to woh product card aur product page par asli price ke saath kati hui (strike-through) dikhegi — jaise discount ho raha ho. Khali chhoro to kuch cross-out nahi dikhega.</Hint>
            <input type="number" min="0" step="0.01" value={compareAtRupees} onChange={(e) => setCompareAtRupees(e.target.value)} placeholder="Khali chhod dein agar discount nahi dikhana" className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#0F766E]" />
          </label>
          {isPhysical && (
            <div className="text-sm font-bold sm:col-span-2">
              Delivery <Hint>Yeh product physical/book hone ki wajah se delivery fee mangta hai. Free rakhein ya ek fixed amount lagayein — yehi fee product page, cart aur checkout par customer se charge hogi.</Hint>
              <div className="mt-2 flex flex-wrap items-center gap-5 rounded-xl border px-4 py-3 font-normal">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="radio" name="delivery-mode" checked={freeDelivery} onChange={() => setFreeDelivery(true)} className="h-4 w-4" />
                  Free delivery
                </label>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="radio" name="delivery-mode" checked={!freeDelivery} onChange={() => setFreeDelivery(false)} className="h-4 w-4" />
                  Paid delivery
                </label>
                {!freeDelivery && (
                  <input required type="number" min="0.01" step="0.01" value={deliveryFeeRupees} onChange={(e) => setDeliveryFeeRupees(e.target.value)} placeholder={`Delivery fee in ${currency}`} className="w-40 rounded-lg border px-3 py-2 text-sm font-normal outline-none focus:border-[#0F766E]" />
                )}
              </div>
            </div>
          )}
          {role === "admin" ? (
            <label className="flex items-start gap-2 text-sm font-bold sm:col-span-2">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="mt-0.5 h-4 w-4" />
              <span>Featured on storefront <Hint>On karne se yeh product home page ke &quot;Featured&quot; section me upar highlight ho kar dikhega.</Hint></span>
            </label>
          ) : (
            <p className="rounded-xl bg-[#F1F5F9] px-4 py-3 text-xs leading-5 text-[#64748B] sm:col-span-2">
              {props.mode === "create"
                ? "New listings start as a draft — an admin reviews and publishes it before it goes live on the store."
                : `Status: ${initial?.status ?? "draft"} — only an admin can publish, unpublish or feature a listing.`}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Variants</p>
            <h2 className="display-font mt-1 text-2xl text-[#0B1D3A]">Purchasable options</h2>
            <p className="mt-1 max-w-md text-xs leading-5 text-[#64748B]">Yeh wo option(s) hain jo customer khareedte waqt product page par choose karta hai (jaise Size/Color, ya sirf ek hi default option). Kam se kam ek variant zaroori hai.</p>
          </div>
          <button type="button" onClick={addVariant} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold">
            <Plus size={15} /> Add variant
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          {variants.map((variant, index) => (
            <div key={index} className="rounded-2xl bg-[#F1F5F9] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#0B1D3A]">Variant {index + 1}</p>
                {variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(index)} className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold">
                  SKU (internal code) <Hint>Sirf aapke record ke liye apna code — customer ko kahin nahi dikhta.</Hint>
                  <input required value={variant.sku} onChange={(e) => updateVariant(index, { sku: e.target.value })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#0F766E]" />
                </label>
                <label className="text-xs font-bold">
                  Option name <Hint>Jaise &quot;Small&quot; ya &quot;Hardcover&quot; — product page par is naam ka button dikhega jise customer click kar ke choose karega.</Hint>
                  <input required value={variant.name} onChange={(e) => updateVariant(index, { name: e.target.value })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#0F766E]" />
                </label>
                <label className="text-xs font-bold">
                  Price (in rupees) <Hint>Is option ki apni price — customer yeh option select kare to cart aur checkout par yehi price lagegi.</Hint>
                  <input required type="number" min="0" step="0.01" value={variant.priceRupees} onChange={(e) => updateVariant(index, { priceRupees: e.target.value })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#0F766E]" />
                </label>
                <label className="text-xs font-bold">
                  Currency <Hint>Is option ki price ki currency.</Hint>
                  <select value={variant.currency} onChange={(e) => updateVariant(index, { currency: e.target.value as (typeof SUPPORTED_CURRENCIES)[number] })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#0F766E]">
                    {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex items-start gap-2 text-xs font-bold">
                  <input type="radio" name="default-variant" checked={variant.isDefault} onChange={() => markDefault(index)} className="mt-0.5 h-4 w-4" />
                  <span>Default variant <Hint>Customer jab product page kholega to yehi option pehle se selected/chuna hua dikhega.</Hint></span>
                </label>
                <label className="flex items-start gap-2 text-xs font-bold">
                  <input type="checkbox" checked={variant.requiresShipping} onChange={(e) => updateVariant(index, { requiresShipping: e.target.checked })} className="mt-0.5 h-4 w-4" />
                  <span>Requires shipping (courier se bhejna hai) <Hint>On karein sirf physical cheez (courier se jaane wali) ke liye — is se neeche delivery fee, stock aur low-stock ke options khulenge, aur checkout par customer se shipping address maanga jayega.</Hint></span>
                </label>
                {variant.requiresShipping && (
                  <>
                    <label className="flex items-start gap-2 text-xs font-bold">
                      <span className="mt-0.5">Stock on hand<Hint>Abhi kitne units available hain. Payment confirm (paid) hote hi is me se ek kam ho jayega, aur store par isi se &quot;X in stock&quot; ya &quot;Out of stock&quot; dikhega.</Hint></span>
                      <input required type="number" min="0" step="1" value={variant.stockQuantity} onChange={(e) => updateVariant(index, { stockQuantity: e.target.value })} placeholder="0" className="mt-0.5 w-24 shrink-0 rounded-lg border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0F766E]" />
                    </label>
                    <label className="flex items-start gap-2 text-xs font-bold">
                      <span className="mt-0.5">Low-stock alert at<Hint>Stock isse kam/barabar reh jaye to product page par ek amber warning (&quot;Only X left in stock&quot;) dikhna shuru ho jayega.</Hint></span>
                      <input required type="number" min="0" step="1" value={variant.lowStockThreshold} onChange={(e) => updateVariant(index, { lowStockThreshold: e.target.value })} placeholder="5" className="mt-0.5 w-24 shrink-0 rounded-lg border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#0F766E]" />
                    </label>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={submitting} className="rounded-full bg-[#0B1D3A] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {submitting ? "Saving…" : props.mode === "edit" ? "Save changes" : "Create product"}
        </button>
        {props.mode === "edit" && (
          <button type="button" onClick={deleteProduct} disabled={deleting} className="rounded-full border border-red-200 px-6 py-3 text-sm font-bold text-red-700 disabled:opacity-50">
            {deleting ? "Deleting…" : "Delete product"}
          </button>
        )}
      </div>
      {error && <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
    </form>
  );
}
