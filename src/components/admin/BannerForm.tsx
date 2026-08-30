"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROMOTION_PLACEMENTS, type PromotionPlacement } from "@/constants/promotion";

export function BannerForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [placement, setPlacement] = useState<PromotionPlacement>("store_home");
  const [linkUrl, setLinkUrl] = useState("");
  const [priority, setPriority] = useState("0");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Saving...");
    const response = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subtitle: subtitle || undefined,
        placement,
        linkUrl: linkUrl || undefined,
        priority: Number(priority),
        startsAt: new Date().toISOString(),
        isActive: true,
      }),
    });
    const data = await response.json() as { error?: string };
    setMessage(response.ok ? "Created — refresh to see it." : (data.error || "Could not create banner."));
    if (response.ok) { setTitle(""); setSubtitle(""); setLinkUrl(""); router.refresh(); }
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3 rounded-3xl border bg-white p-5 sm:grid-cols-5">
      <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Banner title" className="rounded-xl border px-4 py-3" />
      <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtitle (optional)" className="rounded-xl border px-4 py-3" />
      <select value={placement} onChange={(e) => setPlacement(e.target.value as PromotionPlacement)} className="rounded-xl border px-4 py-3">
        {PROMOTION_PLACEMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Link URL (optional)" className="rounded-xl border px-4 py-3" />
      <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="Priority" className="rounded-xl border px-4 py-3" />
      <button className="rounded-full bg-[#103d42] px-5 py-3 text-sm font-bold text-white sm:col-span-5">Create banner</button>
      <span className="text-xs text-[#668084] sm:col-span-5">{message}</span>
    </form>
  );
}
