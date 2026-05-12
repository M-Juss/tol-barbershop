import { z } from "zod";

export const adminSchema = z.object({
  fullname: z
    .string()
    .min(1, "Full name is required")
    .max(255, "Full name must be less than 255 characters"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  contact_number: z.string().min(1, "Contact number is required"),
  image: z.any().optional(),
  is_active: z
    .union([z.boolean(), z.number()])
    .transform((value) => Boolean(value))
    .optional(),
});

export type AdminSchemaFormValues = z.infer<typeof adminSchema>;

export const barberSchema = z.object({
  fullname: z
    .string()
    .min(1, "Full name is required")
    .max(255, "Full name must be less than 255 characters"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  contact_number: z.string().min(1, "Contact number is required"),
  image: z.any().optional(),
  is_active: z
    .union([z.boolean(), z.number()])
    .transform((value) => Boolean(value))
    .optional(),
});

export type BarberSchemaFormValues = z.infer<typeof barberSchema>;
