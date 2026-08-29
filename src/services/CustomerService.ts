/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import type { Address, Customer } from "@/types/domain";
import type { z } from "zod";
import type { addressSchema } from "@/validators/commerce";

const mapAddress = (a: any): Address => ({ id: a.id, label: a.label ?? undefined, fullName: a.full_name, phone: a.phone, line1: a.line1, line2: a.line2 ?? undefined, city: a.city, state: a.state ?? undefined, postalCode: a.postal_code ?? undefined, country: a.country });
export const CustomerService = {
  async getProfile(userId: string): Promise<Customer> { const db = createSupabaseAdminClient(); const [{ data: profile }, { data: authUser }] = await Promise.all([db.from("profiles").select("full_name,phone").eq("id", userId).maybeSingle(), db.auth.admin.getUserById(userId)]); if (!authUser) throw new Error("Customer not found."); return { id: userId, fullName: profile?.full_name ?? undefined, phone: profile?.phone ?? undefined, email: authUser.user?.email ?? "" }; },
  async listAddresses(userId: string): Promise<Address[]> { const { data, error } = await createSupabaseAdminClient().from("addresses").select("*").eq("user_id", userId).order("is_default", { ascending: false }); if (error) throw new Error(error.message); return (data ?? []).map(mapAddress); },
  async upsertAddress(userId: string, input: z.infer<typeof addressSchema>): Promise<Address> { const { data, error } = await createSupabaseAdminClient().from("addresses").insert({ user_id: userId, label: input.label, full_name: input.fullName, phone: input.phone, line1: input.line1, line2: input.line2, city: input.city, state: input.state, postal_code: input.postalCode, country: input.country, is_default: input.isDefault }).select().single(); if (error || !data) throw new Error(error?.message ?? "Address could not be saved."); return mapAddress(data); },
  async deleteAddress(userId: string, addressId: string): Promise<void> { const { error } = await createSupabaseAdminClient().from("addresses").delete().eq("id", addressId).eq("user_id", userId); if (error) throw new Error(error.message); },
};
