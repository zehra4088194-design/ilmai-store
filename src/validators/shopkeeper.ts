import { z } from "zod";
import { SHOPKEEPER_STATUSES } from "@/constants/shopkeeper";

const merchantIdentifier = z.string().trim().regex(/^[\x21-\x7e]{1,99}$/, "Enter the exact JazzCash merchant identifier provided for this account.");
const mobileNumber = z.string().trim().min(7).max(24).regex(/^\+?[0-9 ()-]+$/).refine((value) => (value.match(/\d/g) ?? []).length >= 7);
const displayName = z.string().trim().min(2, "Enter the shop or merchant name.").max(120, "Shop name must be 120 characters or fewer.");

export const shopkeeperAdminCreateSchema = z.object({ displayName });

export const shopkeeperAdminUpdateSchema = z.object({
  displayName,
  jazzcashNumber: mobileNumber,
  receivingIdentifier: z.union([merchantIdentifier, z.literal("")]),
  receivingIdentifierVerified: z.boolean(),
  status: z.enum(SHOPKEEPER_STATUSES),
}).superRefine((value, context) => {
  if (value.status === "active" && (!value.receivingIdentifier || !value.receivingIdentifierVerified || value.jazzcashNumber === "PENDING1")) {
    context.addIssue({ code: "custom", path: ["status"], message: "Active access requires a real JazzCash number and a verified provider-issued receiving identifier." });
  }
});

export const shopkeeperAccountSchema = z.object({
  jazzcashNumber: mobileNumber,
  receivingIdentifier: merchantIdentifier,
});

export const shopkeeperQrSchema = z.object({
  amount: z.union([z.number(), z.string()]),
});
