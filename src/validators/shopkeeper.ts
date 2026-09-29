import { z } from "zod";
import { SHOPKEEPER_STATUSES } from "@/constants/shopkeeper";

const merchantIdentifier = z.string().regex(/^[\x21-\x7e]{1,99}$/, "Enter the exact JazzCash merchant identifier provided for this account.");
const mobileNumber = z.string().trim().min(7).max(24).regex(/^\+?[0-9 ()-]+$/).refine((value) => (value.match(/\d/g) ?? []).length >= 7);

export const shopkeeperProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  jazzcashNumber: mobileNumber,
  jazzcashAccountName: z.string().trim().min(2).max(120),
});

export const shopkeeperAdminUpdateSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  jazzcashNumber: mobileNumber,
  jazzcashAccountName: z.string().trim().min(2).max(120),
  receivingIdentifier: z.union([merchantIdentifier, z.literal("")]),
  receivingIdentifierVerified: z.boolean(),
  status: z.enum(SHOPKEEPER_STATUSES),
}).superRefine((value, context) => {
  if (value.status === "active" && (!value.receivingIdentifier || !value.receivingIdentifierVerified)) {
    context.addIssue({ code: "custom", path: ["status"], message: "Active access requires a JazzCash-provided receiving identifier marked as verified." });
  }
});

export const shopkeeperQrSchema = z.object({
  amount: z.union([z.number(), z.string()]),
});
