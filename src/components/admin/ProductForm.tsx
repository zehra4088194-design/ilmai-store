"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProductForm() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", slug: "", productType: "digital", basePriceMinor: "0", sku: "", variantName: "Default" });
  const [error, setError] = useState<string | null>(null);
  function set(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    const response = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, slug: form.slug, productType: form.productType, basePriceMinor: Number(form.basePriceMinor), currency: "PKR", status: "draft", isFeatured: false, categoryIds: [], variants: [{ sku: form.sku, name: form.variantName, priceMinor: Number(form.basePriceMinor), currency: "PKR", isDefault: true, requiresShipping: ["physical", "book"].includes(form.productType) }] }) });
    if (!response.ok) { const data = await response.json() as { error?: string }; setError(data.error ?? "Product could not be created."); return; }
    router.push("/admin/products"); router.refresh();
  }
  return <form onSubmit={submit} className="mt-8 max-w-2xl rounded-3xl border bg-white p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Title<input required value={form.title} onChange={(event) => set("title", event.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" /></label><label className="text-sm font-bold">Slug<input required value={form.slug} onChange={(event) => set("slug", event.target.value)} placeholder="exam-notes" className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" /></label><label className="text-sm font-bold">Product type<select value={form.productType} onChange={(event) => set("productType", event.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal"><option value="digital">Digital</option><option value="notes">Notes</option><option value="test_series">Test series</option><option value="course">Course</option><option value="book">Book</option><option value="physical">Physical</option></select></label><label className="text-sm font-bold">Price (paisa)<input required type="number" min="0" value={form.basePriceMinor} onChange={(event) => set("basePriceMinor", event.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" /></label><label className="text-sm font-bold">SKU<input required value={form.sku} onChange={(event) => set("sku", event.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" /></label><label className="text-sm font-bold">Variant name<input required value={form.variantName} onChange={(event) => set("variantName", event.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" /></label></div><p className="mt-4 text-sm text-[#668084]">New products start as drafts. Add media and publish after checking the product details.</p><button className="mt-5 rounded-full bg-[#103d42] px-5 py-3 text-sm font-bold text-white">Create draft product</button>{error && <p className="mt-3 text-sm text-red-700">{error}</p>}</form>;
}
