import { z } from "zod";

export const appointmentStatusSchema = z.enum([
  "pending",
  "approved",
  "completed",
  "cancelled",
  "no_show",
  "rejected",
]);

const bookingTimePattern = /^(09|1[0-9]):00$/;

const bookingDateSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00`).getTime()), {
    message: "Appointment date must be a valid date.",
  })
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const latest = new Date(today);
      latest.setDate(latest.getDate() + 30);
      return date >= today && date <= latest;
    },
    { message: "Appointments may only be booked up to 30 days in advance." },
  )
  .refine((value) => new Date(`${value}T00:00:00`).getDay() !== 0, {
    message: "Appointments cannot be booked on Sundays.",
  });

const baseAppointmentSchema = z.object({
  user_id: z.number().int().positive(),
  service_id: z.number().int().positive(),
  barber_user_id: z.number().int().positive(),
  appointment_date: bookingDateSchema,
  appointment_time: z
    .string()
    .regex(
      bookingTimePattern,
      "Appointment time must be on the hour from 09:00 through 19:00.",
    ),
  duration_minutes: z.number().int().min(1).nullable().optional(),
  price: z.number().int("Price must be a whole number").min(0).max(999999),
  status: appointmentStatusSchema.optional(),
  notes: z.string().max(500).nullable().optional(),
  cancellation_reason: z.string().max(500).nullable().optional(),
});

export const createAppointmentSchema = baseAppointmentSchema;

const updateBaseSchema = z.object({
  user_id: z.number().int().positive(),
  service_id: z.number().int().positive(),
  barber_user_id: z.number().int().positive(),
  appointment_date: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Appointment date must be a valid date.",
    }),
  appointment_time: z
    .string()
    .regex(
      bookingTimePattern,
      "Appointment time must be on the hour from 09:00 through 19:00.",
    ),
  duration_minutes: z.number().int().min(1).nullable().optional(),
  price: z.number().int("Price must be a whole number").min(0).max(999999),
  status: appointmentStatusSchema.optional(),
  notes: z.string().max(500).nullable().optional(),
  cancellation_reason: z.string().max(500).nullable().optional(),
});

export const updateAppointmentSchema = updateBaseSchema;

export const cancellationReasonSchema = z.object({
  cancellation_reason: z
    .string()
    .trim()
    .min(1, "Please provide a reason for this action.")
    .max(500, "Cancellation reason must not exceed 500 characters."),
});

const batchSlotSchema = z.object({
  customer_name: z.string().max(255).nullable(),
  service_id: z.number().int().positive(),
  appointment_time: z
    .string()
    .regex(
      bookingTimePattern,
      "Appointment time must be on the hour from 09:00 through 19:00.",
    ),
  duration_minutes: z.number().int().min(1).optional(),
  price: z.number().int("Price must be a whole number").min(0).max(999999),
});

export const batchAppointmentSchema = z.object({
  barber_user_id: z.number().int().positive(),
  appointment_date: bookingDateSchema,
  notes: z.string().max(500).nullable().optional(),
  appointments: z.array(batchSlotSchema).min(2).max(11),
});

export type CreateAppointmentSchemaValues = z.infer<
  typeof createAppointmentSchema
>;
export type UpdateAppointmentSchemaValues = z.infer<
  typeof updateAppointmentSchema
>;
export type CancellationReasonSchemaFormValues = z.infer<
  typeof cancellationReasonSchema
>;
export type BatchAppointmentSchemaValues = z.infer<typeof batchAppointmentSchema>;
