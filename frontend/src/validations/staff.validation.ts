import { z } from "zod";

const activeFlagSchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  return value;
}, z.boolean());

const adminBaseSchema = z.object({
  fullname: z
    .string()
    .min(1, "Full name is required")
    .max(255, "Full name must be less than 255 characters"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  contact_number: z.string().min(1, "Contact number is required"),
  image: z.any().optional(),
  is_active: activeFlagSchema.optional(),
});

export const adminCreateSchema = adminBaseSchema
  .extend({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const adminUpdateSchema = adminBaseSchema
  .extend({
    password: z.string().optional().or(z.literal("")),
    confirm_password: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const password = data.password ?? "";
    const confirmPassword = data.confirm_password ?? "";
    const hasPassword = password.trim().length > 0;
    const hasConfirm = confirmPassword.trim().length > 0;

    if (hasPassword && password.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password must be at least 8 characters",
      });
    }

    if (hasPassword && !hasConfirm) {
      ctx.addIssue({
        code: "custom",
        path: ["confirm_password"],
        message: "Confirm password is required",
      });
    }

    if (!hasPassword && hasConfirm) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password is required",
      });
    }

    if (hasPassword && hasConfirm && password !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirm_password"],
        message: "Passwords do not match",
      });
    }
  });

export type AdminCreateSchemaFormValues = z.infer<typeof adminCreateSchema>;
export type AdminUpdateSchemaFormValues = z.infer<typeof adminUpdateSchema>;
export type AdminSchemaFormValues = AdminUpdateSchemaFormValues;

export const barberSchema = z.object({
  fullname: z
    .string()
    .min(1, "Full name is required")
    .max(255, "Full name must be less than 255 characters"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  contact_number: z.string().min(1, "Contact number is required"),
  image: z.any().optional(),
  is_active: activeFlagSchema.optional(),
});

export type BarberSchemaFormValues = z.infer<typeof barberSchema>;
