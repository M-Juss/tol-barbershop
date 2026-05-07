import { z } from "zod/v3";

export const registerSchema = z.object({
    fullname: z
    .string()
    .trim()
    .nonempty("Fullname is required"),

    email: z
    .string()
    .trim()
    .email("Invalid email address")
    .nonempty("Email is required."),

    contact_number: z
    .string()
    .trim()
    .nonempty("Contact Number is required.")
    .regex(/^(09|\+639|639)\d{9}$/, "Invalid Contact Number"),

    password: z
    .string()
    .trim()
    .nonempty("Password is required.")
    .min(8, "Password must be at least 8 characters"),

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
    .nonempty("Password is required.")
    .min(8, "Password must be at least 8 characters"),

})

export type LoginSchemaFormValues = z.infer<typeof loginSchema>