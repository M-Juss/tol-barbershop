import { z } from "zod/v3";

export const registerSchema = z.object({
    fullname: z
    .string()
    .trim()
    .nonempty("Fullname is required")
    .max(255, "Full name must not exceed 255 characters")
    .regex(/^[A-Za-z\s]+$/, "Full name must only contain letters and spaces"),

    email: z
    .string()
    .trim()
    .email("Invalid email address")
    .nonempty("Email is required.")
    .max(255, "Email must not exceed 255 characters"),

    contact_number: z
    .string()
    .trim()
    .nonempty("Contact Number is required.")
    .regex(/^09\d{9}$/, "Contact number must be a valid PH mobile number (09XXXXXXXXX)")
    .max(11, "Contact number must not exceed 11 digits"),

    password: z
    .string()
    .nonempty("Password is required.")
    .min(6, "Password must be at least 6 characters")
    .max(255, "Password must not exceed 255 characters"),

    password_confirmation: z
    .string()
    .nonempty("Password Confirmation is required!")
    .max(255, "Password confirmation must not exceed 255 characters"),

    terms_accepted: z
    .boolean()
    .refine((accepted) => accepted, "You must accept the Terms of Use"),

    privacy_acknowledged: z
    .boolean()
    .refine((acknowledged) => acknowledged, "You must acknowledge the Privacy Policy"),

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
    .nonempty("Email is required.")
    .max(255, "Email must not exceed 255 characters"),

    password: z
    .string()
    .nonempty("Password is required.")
    .max(255, "Password must not exceed 255 characters"),

})

export type LoginSchemaFormValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .nonempty("Email is required.")
    .max(255, "Email must not exceed 255 characters"),
});

export type ForgotPasswordSchemaFormValues = z.infer<typeof forgotPasswordSchema>;

export const verifyEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .nonempty("Email is required.")
    .max(255, "Email must not exceed 255 characters"),
});

export type VerifyEmailSchemaFormValues = z.infer<typeof verifyEmailSchema>;

export const changeRegistrationEmailSchema = z
  .object({
    current_email: z
      .string()
      .trim()
      .email("Invalid current email address")
      .max(255, "Email must not exceed 255 characters"),
    new_email: z
      .string()
      .trim()
      .email("Invalid email address")
      .max(255, "Email must not exceed 255 characters"),
    new_email_confirmation: z
      .string()
      .trim()
      .email("Invalid confirmation email address")
      .max(255, "Email confirmation must not exceed 255 characters"),
    password: z
      .string()
      .nonempty("Registration password is required")
      .max(255, "Password must not exceed 255 characters"),
  })
  .refine((data) => data.new_email === data.new_email_confirmation, {
    path: ["new_email_confirmation"],
    message: "Email addresses do not match",
  })
  .refine(
    (data) =>
      data.current_email.toLowerCase() !== data.new_email.toLowerCase(),
    {
      path: ["new_email"],
      message: "New email must be different from the current email",
    },
  );

export type ChangeRegistrationEmailSchemaFormValues = z.infer<
  typeof changeRegistrationEmailSchema
>;

export const resetPasswordLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must not exceed 255 characters"),
  token: z
    .string()
    .min(1, "Reset token is required")
    .max(255, "Reset token is invalid"),
});

export const resetPasswordSchema = resetPasswordLinkSchema
  .extend({
    password: z
      .string()
      .nonempty("Password is required.")
      .min(6, "Password must be at least 6 characters")
      .max(255, "Password must not exceed 255 characters"),
    password_confirmation: z
      .string()
      .nonempty("Password Confirmation is required!")
      .max(255, "Password confirmation must not exceed 255 characters"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "Passwords do not match",
  });

export type ResetPasswordSchemaFormValues = z.infer<typeof resetPasswordSchema>;
