import { z } from "zod";

const walkinDateSchema = z
  .string()
  .min(1, "Date is required.")
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00`).getTime()), {
    message: "Date must be a valid date.",
  })
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date <= today;
    },
    { message: "Walk-in date cannot be in the future." },
  )
  .refine((value) => new Date(`${value}T00:00:00`).getDay() !== 0, {
    message: "The barbershop is closed on Sundays.",
  });

export const walkinSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(2, "Customer name is required.")
    .max(255, "Customer name must not exceed 255 characters.")
    .regex(/^[A-Za-z\s]+$/, "Customer name must only contain letters and spaces"),
  service_id: z.number().int().positive("Please select a service."),
  barber_user_id: z.number().int().positive("Please select a barber."),
  appointment_date: walkinDateSchema,
  appointment_time: z
    .string()
    .min(1, "Time is required.")
    .regex(
      /^(09|1[0-1]):00$|^12:30$|^(1[3-9]):00$/,
      "Appointment time must be on the hour from 09:00 through 19:00.",
    ),
  price: z
    .number()
    .int("Price must be a whole number")
    .min(0, "Price must be valid.")
    .max(999999, "Price must not exceed 999999."),
  duration_minutes: z.number().int().min(1).nullable().optional(),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must not exceed 500 characters.")
    .nullable()
    .optional(),
});

export type WalkinSchemaValues = z.infer<typeof walkinSchema>;
