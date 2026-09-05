"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

type RowResult = { row: number; slug: string; ok: boolean; error?: string };
type ImportResponse = { created: number; failed: number; results: RowResult[] } | { error: string };

const TEMPLATE_HEADER = "slug,title,description,productType,basePriceRupees,currency,compareAtPriceRupees,deliveryFeeRupees,sku,stockQuantity,isFeatured";

export function ProductImportForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyTemplate() {
    try { await navigator.clipboard.writeText(TEMPLATE_HEADER); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/admin/products/import", { method: "POST", body: form });
      const data = await response.json() as ImportResponse;
      setResult(data);
      if ("created" in data && data.created > 0) router.refresh();
    } catch {
      setResult({ error: "Import could not be processed." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-3xl border bg-white p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">Bulk import</p>
      <h2 className="display-font mt-1 text-2xl text-[#0B1D3A]">Add many products from a CSV.</h2>
      <p className="mt-2 text-sm leading-6 text-[#64748B]">
        Each row creates one product with a single default variant, starting as a draft (review and publish afterwards). For products with multiple options (sizes, editions), add those individually via the regular form.
      </p>
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#F1F5F9] p-3">
        <code className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap text-xs text-[#0B1D3A]">{TEMPLATE_HEADER}</code>
        <button type="button" onClick={copyTemplate} className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold">{copied ? "Copied" : "Copy header"}</button>
      </div>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept=".csv,text/csv" required className="text-sm" />
        <button type="submit" disabled={uploading} className="inline-flex items-center gap-2 rounded-full bg-[#0B1D3A] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} {uploading ? "Importing…" : "Import CSV"}
        </button>
      </form>

      {result && "error" in result && <p className="mt-4 text-sm font-semibold text-red-700">{result.error}</p>}
      {result && "created" in result && (
        <div className="mt-4">
          <p className="text-sm font-bold text-[#0B1D3A]">{result.created} created, {result.failed} failed.</p>
          {result.failed > 0 && (
            <div className="mt-2 grid gap-1 text-xs text-red-700">
              {result.results.filter((r) => !r.ok).map((r) => <p key={r.row}>Row {r.row} ({r.slug}): {r.error}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
