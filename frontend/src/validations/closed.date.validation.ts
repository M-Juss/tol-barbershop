import { z } from "zod";

export const closedDateSchema = z
  .object({
    date_closed: z.date({ message: "Closed date is required" }),
    closure_scope: z.enum(["shop", "barber"]),
    barber_user_id: z.number().int().positive().nullable().optional(),
    reason: z
      .string()
      .trim()
      .min(1, "Reason is required")
      .max(255, "Reason must not exceed 255 characters"),
  })
  .superRefine((data, context) => {
    if (data.closure_scope === "barber" && !data.barber_user_id) {
      context.addIssue({
        code: "custom",
        path: ["barber_user_id"],
        message: "Barber is required",
      });
    }
  });

export type ClosedDateSchemaFormValues = z.infer<typeof closedDateSchema>;
