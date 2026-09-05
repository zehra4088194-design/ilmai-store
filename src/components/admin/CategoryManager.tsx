"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, X, Check } from "lucide-react";
import type { Category } from "@/types/domain";

type FormState = {
  slug: string;
  name: string;
  description: string;
  parentId: string;
  sortOrder: string;
};

const emptyForm: FormState = { slug: "", name: "", description: "", parentId: "", sortOrder: "0" };

function toPayload(form: FormState) {
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    parentId: form.parentId || undefined,
    sortOrder: form.sortOrder.trim() === "" ? 0 : Number(form.sortOrder),
  };
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Category could not be created.");
      setForm(emptyForm);
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Category could not be created.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setRowError(null);
    setEditForm({
      slug: c.slug,
      name: c.name,
      description: c.description ?? "",
      parentId: c.parentId ?? "",
      sortOrder: "0",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setRowError(null);
  }

  async function handleSave(id: string) {
    setSavingId(id);
    setRowError(null);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(editForm)),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Category could not be saved.");
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Category could not be saved.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Category could not be deleted.");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Category could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  }

  const parentOptions = categories.filter((c) => c.id !== editingId);

  return (
    <div className="mt-8 grid gap-8">
      <form
        onSubmit={handleCreate}
        className="rounded-3xl border bg-white p-6 shadow-sm lg:p-8"
      >
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#0F766E]">New category</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <input
            required
            placeholder="Slug (e.g. mathematics)"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="rounded-xl border px-4 py-3 text-sm lg:col-span-1"
          />
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-xl border px-4 py-3 text-sm lg:col-span-1"
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="rounded-xl border px-4 py-3 text-sm lg:col-span-2"
          />
          <select
            value={form.parentId}
            onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
            className="rounded-xl border px-4 py-3 text-sm lg:col-span-1"
          >
            <option value="">No parent</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Sort order"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            className="rounded-xl border px-4 py-3 text-sm lg:col-span-1"
          />
        </div>
        {createError && <p className="mt-3 text-sm font-semibold text-red-600">{createError}</p>}
        <button
          type="submit"
          disabled={creating}
          className="mt-4 rounded-full bg-[#0B1D3A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {creating ? "Creating…" : "+ Add category"}
        </button>
      </form>

      <div className="overflow-hidden rounded-3xl border bg-white">
        <div className="grid grid-cols-[1fr_1fr_1fr_100px_80px] gap-4 border-b px-5 py-4 text-xs font-bold uppercase tracking-widest text-[#64748B]">
          <span>Name</span>
          <span>Slug</span>
          <span>Description</span>
          <span>Parent</span>
          <span />
        </div>
        {categories.map((c) => {
          const isEditing = editingId === c.id;
          const parent = categories.find((p) => p.id === c.parentId);
          return (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_1fr_1fr_100px_80px] items-center gap-4 border-b px-5 py-4 text-sm hover:bg-[#F1F5F9]"
            >
              {isEditing ? (
                <>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <input
                    value={editForm.slug}
                    onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <select
                    value={editForm.parentId}
                    onChange={(e) => setEditForm((f) => ({ ...f, parentId: e.target.value }))}
                    className="rounded-lg border px-2 py-2 text-xs"
                  >
                    <option value="">None</option>
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSave(c.id)}
                      disabled={savingId === c.id}
                      title="Save"
                      className="text-[#0F766E] hover:text-[#0B1D3A]"
                    >
                      <Check size={16} />
                    </button>
                    <button onClick={cancelEdit} title="Cancel" className="text-[#64748B] hover:text-[#0B1D3A]">
                      <X size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="font-bold">{c.name}</span>
                  <span className="text-[#64748B]">{c.slug}</span>
                  <span className="truncate text-[#64748B]">{c.description ?? "—"}</span>
                  <span className="text-[#64748B]">{parent?.name ?? "—"}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(c)} title="Edit" className="text-[#64748B] hover:text-[#0F766E]">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      title="Delete"
                      className="text-[#64748B] hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {!categories.length && <p className="p-10 text-center text-[#64748B]">No categories yet.</p>}
      </div>
      {rowError && <p className="text-sm font-semibold text-red-600">{rowError}</p>}
    </div>
  );
}
