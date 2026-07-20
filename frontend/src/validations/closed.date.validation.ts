import { z } from "zod";

export const closedDateSchema = z.object({
  date_closed: z.date({ message: "Closed date is required" }),
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(255, "Reason must not exceed 255 characters"),
});

export type ClosedDateSchemaFormValues = z.infer<typeof closedDateSchema>;
