"use client";
import { useState } from "react";

export function InventoryEditor({ variantId, quantityAvailable, lowStockThreshold }: { variantId: string; quantityAvailable: number; lowStockThreshold: number }) {
  const [quantity, setQuantity] = useState(String(quantityAvailable)); const [threshold, setThreshold] = useState(String(lowStockThreshold)); const [message, setMessage] = useState("");
  async function save() { setMessage("Saving..."); const response = await fetch("/api/admin/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId, quantityAvailable: Number(quantity), lowStockThreshold: Number(threshold) }) }); setMessage(response.ok ? "Saved" : "Could not save"); }
  return <div className="flex items-center gap-2"><input aria-label="Available quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-20 rounded-lg border px-2 py-2"/><input aria-label="Low stock threshold" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-20 rounded-lg border px-2 py-2"/><button type="button" onClick={save} className="rounded-full bg-[#103d42] px-3 py-2 text-xs font-bold text-white">Save</button><span className="text-xs text-[#668084]">{message}</span></div>;
}
