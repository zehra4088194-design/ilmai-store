"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PRODUCT_TYPES, PRODUCT_STATUSES } from "@/constants/product";
import { SUPPORTED_CURRENCIES } from "@/constants/order";
import type { Product } from "@/types/domain";

type VariantForm = {
  sku: string;
  name: string;
  priceRupees: string;
  currency: (typeof SUPPORTED_CURRENCIES)[number];
  isDefault: boolean;
  requiresShipping: boolean;
};

function emptyVariant(isDefault: boolean, currency: (typeof SUPPORTED_CURRENCIES)[number]): VariantForm {
  return { sku: "", name: "", priceRupees: "", currency, isDefault, requiresShipping: false };
}

function toVariantForm(product: Product): VariantForm[] {
  return product.variants.map((v) => ({
    sku: v.sku,
    name: v.name,
    priceRupees: (v.price.amountMinor / 100).toString(),
    currency: v.price.currency as (typeof SUPPORTED_CURRENCIES)[number],
    isDefault: v.isDefault,
    requiresShipping: v.requiresShipping,
  }));
}

type Props = { mode: "create" } | { mode: "edit"; product: Product };

export function ProductForm(props: Props) {
  const router = useRouter();
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
        isFeatured,
        categoryIds: [] as string[],
        variants: variants.map((v) => ({
          sku: v.sku,
          name: v.name,
          priceMinor: Math.round(Number(v.priceRupees) * 100),
          currency: v.currency,
          isDefault: v.isDefault,
          requiresShipping: v.requiresShipping,
        })),
      };

      const url = props.mode === "edit" ? `/api/admin/products/${props.product.id}` : "/api/admin/products";
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
        router.push(`/admin/products/${created.id}`);
      } else {
        router.push("/admin/products");
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
      const response = await fetch(`/api/admin/products/${props.product.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Product could not be deleted.");
        return;
      }
      router.push("/admin/products");
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
            Title
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#14777a]" />
          </label>
          <label className="text-sm font-bold">
            Slug
            <input required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="exam-notes" className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#14777a]" />
          </label>
          <label className="text-sm font-bold sm:col-span-2">
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#14777a]" />
          </label>
          <label className="text-sm font-bold">
            Product type
            <select value={productType} onChange={(e) => setProductType(e.target.value as (typeof PRODUCT_TYPES)[number])} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#14777a]">
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as (typeof PRODUCT_STATUSES)[number])} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#14777a]">
              {PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">
            Base price (in rupees, converted to minor units)
            <input required type="number" min="0" step="0.01" value={priceRupees} onChange={(e) => setPriceRupees(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#14777a]" />
          </label>
          <label className="text-sm font-bold">
            Currency
            <select value={currency} onChange={(e) => setCurrency(e.target.value as (typeof SUPPORTED_CURRENCIES)[number])} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:border-[#14777a]">
              {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4" />
            Featured on storefront
          </label>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#14777a]">Variants</p>
            <h2 className="display-font mt-1 text-2xl text-[#103d42]">Purchasable options</h2>
          </div>
          <button type="button" onClick={addVariant} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold">
            <Plus size={15} /> Add variant
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          {variants.map((variant, index) => (
            <div key={index} className="rounded-2xl bg-[#f5f7f3] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#103d42]">Variant {index + 1}</p>
                {variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(index)} className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold">
                  SKU
                  <input required value={variant.sku} onChange={(e) => updateVariant(index, { sku: e.target.value })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#14777a]" />
                </label>
                <label className="text-xs font-bold">
                  Name
                  <input required value={variant.name} onChange={(e) => updateVariant(index, { name: e.target.value })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#14777a]" />
                </label>
                <label className="text-xs font-bold">
                  Price (in rupees)
                  <input required type="number" min="0" step="0.01" value={variant.priceRupees} onChange={(e) => updateVariant(index, { priceRupees: e.target.value })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#14777a]" />
                </label>
                <label className="text-xs font-bold">
                  Currency
                  <select value={variant.currency} onChange={(e) => updateVariant(index, { currency: e.target.value as (typeof SUPPORTED_CURRENCIES)[number] })} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#14777a]">
                    {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-xs font-bold">
                  <input type="radio" name="default-variant" checked={variant.isDefault} onChange={() => markDefault(index)} className="h-4 w-4" />
                  Default variant
                </label>
                <label className="flex items-center gap-2 text-xs font-bold">
                  <input type="checkbox" checked={variant.requiresShipping} onChange={(e) => updateVariant(index, { requiresShipping: e.target.checked })} className="h-4 w-4" />
                  Requires shipping
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={submitting} className="rounded-full bg-[#103d42] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
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
