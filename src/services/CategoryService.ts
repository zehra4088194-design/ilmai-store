import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Category } from "@/types/domain";
import type { z } from "zod";
import type { categorySchema } from "@/validators/product";

function map(row: Record<string, unknown>): Category {
  return { id: String(row.id), slug: String(row.slug), name: String(row.name), description: typeof row.description === "string" ? row.description : undefined, parentId: typeof row.parent_id === "string" ? row.parent_id : undefined };
}

export const CategoryService = {
  async adminList(): Promise<Category[]> {
    const { data, error } = await createSupabaseAdminClient().from("categories").select("*").order("sort_order").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(map);
  },
  async adminCreate(input: z.infer<typeof categorySchema>): Promise<Category> {
    const { data, error } = await createSupabaseAdminClient().from("categories").insert({ slug: input.slug, name: input.name, description: input.description, parent_id: input.parentId ?? null, sort_order: input.sortOrder }).select().single();
    if (error || !data) throw new ValidationError(error?.message ?? "Category could not be created.");
    return map(data);
  },
  async adminUpdate(id: string, input: Partial<z.infer<typeof categorySchema>>): Promise<Category> {
    const update = { ...(input.slug === undefined ? {} : { slug: input.slug }), ...(input.name === undefined ? {} : { name: input.name }), ...(input.description === undefined ? {} : { description: input.description }), ...(input.parentId === undefined ? {} : { parent_id: input.parentId }), ...(input.sortOrder === undefined ? {} : { sort_order: input.sortOrder }) };
    const { data, error } = await createSupabaseAdminClient().from("categories").update(update).eq("id", id).select().single();
    if (error || !data) throw new NotFoundError("Category not found.");
    return map(data);
  },
  async adminDelete(id: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().from("categories").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
