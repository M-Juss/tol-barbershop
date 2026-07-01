import { z } from "zod/v3";

export const registerSchema = z.object({
    fullname: z
    .string()
    .trim()
    .nonempty("Fullname is required")
    .regex(/^[A-Za-z\s]+$/, "Full name must only contain letters and spaces"),

    email: z
    .string()
    .trim()
    .email("Invalid email address")
    .nonempty("Email is required."),

    contact_number: z
    .string()
    .trim()
    .nonempty("Contact Number is required.")
    .regex(/^09\d{9}$/, "Contact number must be a valid PH mobile number (09XXXXXXXXX)")
    .max(11, "Contact number must not exceed 11 digits"),

    password: z
    .string()
    .trim()
    .nonempty("Password is required.")
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/,
      "Must have uppercase, lowercase, number & special character"
    ),

    password_confirmation: z
    .string()
    .trim()
    .nonempty("Password Confirmation is required!")

}).refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "Passwords do not match",
});

export type RegisterSchemaFormValues = z.infer<typeof registerSchema>


export const loginSchema = z.object({

    email: z
    .string()
    .trim()
    .email("Invalid email address")
    .nonempty("Email is required."),

    password: z
    .string()
    .trim()
    .nonempty("Password is required."),

})

export type LoginSchemaFormValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .nonempty("Email is required."),
});

export type ForgotPasswordSchemaFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .trim()
      .nonempty("Password is required.")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/,
        "Must have uppercase, lowercase, number & special character",
      ),
    password_confirmation: z
      .string()
      .trim()
      .nonempty("Password Confirmation is required!"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "Passwords do not match",
  });

export type ResetPasswordSchemaFormValues = z.infer<typeof resetPasswordSchema>;
