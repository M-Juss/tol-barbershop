import { z } from "zod";

export const serviceSchema = z.object({
  name: z
    .string()
    .min(1, "Service name is required")
    .max(255, "Service name must be less than 255 characters")
    .regex(/^[A-Za-z\s]+$/, "Service name must only contain letters and spaces"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(1000, "Description must not exceed 1000 characters"),
  duration: z
    .number()
    .int("Duration must be a whole number")
    .min(1, "Duration must be at least 1 minute")
    .max(480, "Duration must not exceed 480 minutes"),
  price: z
    .number()
    .int("Price must be a whole number")
    .min(0, "Price must be at least 0")
    .max(999999, "Price must not exceed 999999"),
  is_active: z.boolean(),
});

export type ServiceSchemaFormValues = z.infer<typeof serviceSchema>;
