import { z } from "zod";

export const exchangeRateSettingsSchema = z.object({
  usdToPkr: z.coerce.number().finite().positive().max(100_000),
  mode: z.enum(["auto", "manual"]),
});
