"use client";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function BannerDeleteButton({ bannerId }: { bannerId: string }) {
  const router = useRouter();
  async function remove() {
    if (!confirm("Delete this banner?")) return;
    const response = await fetch(`/api/admin/banners/${bannerId}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }
  return (
    <button type="button" onClick={remove} className="text-[#64748B] hover:text-red-700" title="Delete banner">
      <Trash2 size={16} />
    </button>
  );
}
