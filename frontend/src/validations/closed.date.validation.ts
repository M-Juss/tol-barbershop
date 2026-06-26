import { z } from "zod";

export const closedDateSchema = z.object({
  date_closed: z.date({ message: "Closed date is required" }),
  reason: z
    .string()
    .min(1, "Reason is required"),
});

export type ClosedDateSchemaFormValues = z.infer<typeof closedDateSchema>;
