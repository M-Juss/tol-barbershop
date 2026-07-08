import { z } from "zod";

export const walkinSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(2, "Customer name is required.")
    .regex(/^[A-Za-z\s]+$/, "Customer name must only contain letters and spaces"),
  service_id: z.number().int().positive("Please select a service."),
  barber_user_id: z.number().int().positive("Please select a barber."),
  price: z.number().int("Price must be a whole number").min(0, "Price must be valid."),
  duration_minutes: z.number().int().min(1).nullable().optional(),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must not exceed 500 characters.")
    .nullable()
    .optional(),
});

export type WalkinSchemaValues = z.infer<typeof walkinSchema>;
