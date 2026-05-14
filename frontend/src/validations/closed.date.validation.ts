import { z } from "zod";

export const closedDateSchema = z.object({
  date_closed: z.date({
    required_error: "Closed date is required",
    invalid_type_error: "Closed date is required",
  }),
  reason: z
    .string()
    .min(1, "Reason is required"),
});

export type ClosedDateSchemaFormValues = z.infer<typeof closedDateSchema>;
