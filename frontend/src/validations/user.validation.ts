import { z } from "zod";

export const accountInformationSchema = z.object({
  fullname: z
    .string()
    .min(1, "Full name is required")
    .max(255, "Full name must be less than 255 characters"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  contact_number: z
    .string()
    .min(1, "Contact number is required")
    .max(20, "Contact number must be less than 20 characters"),
});

export type AccountInformationSchemaFormValues = z.infer<
  typeof accountInformationSchema
>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(255, "Password must be less than 255 characters"),
    password_confirmation: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

export type ChangePasswordSchemaFormValues = z.infer<typeof changePasswordSchema>;
