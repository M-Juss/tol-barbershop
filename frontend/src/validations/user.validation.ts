import { z } from "zod";

export const accountInformationSchema = z.object({
  fullname: z
    .string()
    .min(1, "Full name is required")
    .max(255, "Full name must be less than 255 characters")
    .regex(/^[A-Za-z\s]+$/, "Full name must only contain letters and spaces"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  contact_number: z
    .string()
    .min(1, "Contact number is required")
    .regex(/^09\d{9}$/, "Contact number must be a valid PH mobile number (09XXXXXXXXX)")
    .max(11, "Contact number must not exceed 11 digits"),
});

export type AccountInformationSchemaFormValues = z.infer<
  typeof accountInformationSchema
>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(255, "Password must be less than 255 characters"),
    password_confirmation: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

export type ChangePasswordSchemaFormValues = z.infer<typeof changePasswordSchema>;
