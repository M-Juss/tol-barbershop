import { z } from "zod";

export const serviceSchema = z.object({
  name: z
    .string()
    .min(1, "Service name is required")
    .max(255, "Service name must be less than 255 characters")
    .regex(/^[A-Za-z\s]+$/, "Service name must only contain letters and spaces"),
  description: z.string().min(1, "Description is required"),
  duration: z.number().int("Duration must be a whole number").min(1, "Duration must be at least 1 minute"),
  price: z.number().int("Price must be a whole number").min(1, "Price must be at least 1"),
  is_active: z.boolean(),
});

export type ServiceSchemaFormValues = z.infer<typeof serviceSchema>;
