import { z } from "zod";
import { SHOPKEEPER_STATUSES } from "@/constants/shopkeeper";

const merchantIdentifier = z.string().regex(/^[\x21-\x7e]{1,99}$/, "Enter the exact JazzCash merchant identifier provided for this account.");
const mobileNumber = z.string().trim().min(7).max(24).regex(/^\+?[0-9 ()-]+$/).refine((value) => (value.match(/\d/g) ?? []).length >= 7);

export const shopkeeperAdminCreateSchema = z.object({
  email: z.string().trim().email().max(320),
  jazzcashNumber: mobileNumber,
  receivingIdentifier: z.union([merchantIdentifier, z.literal("")]).optional().default(""),
  receivingIdentifierVerified: z.boolean().default(false),
});

export const shopkeeperAdminUpdateSchema = z.object({
  jazzcashNumber: mobileNumber,
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
