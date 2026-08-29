"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    const response = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug, sortOrder: 0 }) });
    if (!response.ok) { const data = await response.json() as { error?: string }; setError(data.error ?? "Category could not be created."); return; }
    setName(""); setSlug(""); router.refresh();
  }
  return <form onSubmit={submit} className="rounded-3xl border bg-white p-5"><p className="font-bold">New category</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="rounded-xl border px-4 py-3" /><input required value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="slug-like-this" className="rounded-xl border px-4 py-3" /></div><button className="mt-3 rounded-full bg-[#103d42] px-4 py-2.5 text-sm font-bold text-white">Add category</button>{error && <p className="mt-2 text-sm text-red-700">{error}</p>}</form>;
}
