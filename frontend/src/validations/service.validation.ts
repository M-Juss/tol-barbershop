import { z } from "zod";

export const serviceSchema = z.object({
  name: z
    .string()
    .min(1, "Service name is required")
    .max(255, "Service name must be less than 255 characters"),
  description: z.string().min(1, "Description is required"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  price: z.number().min(1, "Price must be at least 1"),
  is_active: z.boolean(),
});

export type ServiceSchemaFormValues = z.infer<typeof serviceSchema>;
