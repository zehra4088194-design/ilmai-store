import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Category } from "@/types/domain";
import type { z } from "zod";
import type { categorySchema, categoryUpdateSchema } from "@/validators/product";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

function mapCategory(row: Raw): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    parentId: row.parent_id ?? undefined,
  };
}

export const CategoryService = {
  /** Public: active categories only, ordered for display. */
  async list(): Promise<Category[]> {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCategory);
  },

  /** Admin: every category, including inactive ones. */
  async adminList(): Promise<Category[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCategory);
  },

  async adminCreate(input: z.infer<typeof categorySchema>): Promise<Category> {
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from("categories")
      .insert({
        slug: input.slug,
        name: input.name,
        description: input.description,
        parent_id: input.parentId,
        sort_order: input.sortOrder,
      })
      .select("*")
      .single();
    if (error || !data) throw new ValidationError(error?.message ?? "Category could not be created.");
    return mapCategory(data);
  },

  async adminUpdate(input: { id: string } & z.infer<typeof categoryUpdateSchema>): Promise<Category> {
    const db = createSupabaseAdminClient();
    const { id, ...fields } = input;
    const update: Raw = {};
    if (fields.slug !== undefined) update.slug = fields.slug;
    if (fields.name !== undefined) update.name = fields.name;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.parentId !== undefined) update.parent_id = fields.parentId;
    if (fields.sortOrder !== undefined) update.sort_order = fields.sortOrder;
    const { data, error } = await db.from("categories").update(update).eq("id", id).select("*").maybeSingle();
    if (error) throw new ValidationError(error.message);
    if (!data) throw new NotFoundError("Category not found.");
    return mapCategory(data);
  },

  async adminDelete(id: string): Promise<void> {
    const { error } = await createSupabaseAdminClient().from("categories").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
