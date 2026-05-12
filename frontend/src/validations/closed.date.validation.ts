import { z } from "zod";

export const closedDateSchema = z.object({
  date_closed: z.date({
    required_error: "Date is required",
    invalid_type_error: "Date must be a valid date",
  }),
  reason: z
    .string({
      required_error: "Reason is required",
      invalid_type_error: "Reason must be a string",
    })
    .min(1, "Reason is required"),
});

export type ClosedDateSchemaFormValues = z.infer<typeof closedDateSchema>;
