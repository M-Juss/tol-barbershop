import { z } from "zod";

export const walkinSchema = z.object({
  customer_name: z.string().trim().min(2, "Customer name is required."),
  phone: z.string().trim().min(7, "Phone number is required."),
  service_id: z.number().int().positive("Please select a service."),
  barber_user_id: z.number().int().positive("Please select a barber."),
  price: z.number().min(0, "Price must be valid."),
  duration_minutes: z.number().int().min(1).nullable().optional(),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must not exceed 500 characters.")
    .nullable()
    .optional(),
});

export type WalkinSchemaValues = z.infer<typeof walkinSchema>;
