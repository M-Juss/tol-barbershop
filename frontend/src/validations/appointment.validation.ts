import { z } from "zod";

export const appointmentStatusSchema = z.enum([
  "pending",
  "approved",
  "completed",
  "cancelled",
  "no_show",
]);

const time24Pattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const today = new Date();
today.setHours(0, 0, 0, 0);

const baseAppointmentSchema = z.object({
  user_id: z.number().int().positive(),
  service_id: z.number().int().positive(),
  barber_user_id: z.number().int().positive(),
  appointment_date: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Appointment date must be a valid date.",
    })
    .refine(
      (value) => {
        const date = new Date(value);
        date.setHours(0, 0, 0, 0);
        return date >= today;
      },
      {
        message: "Appointment date must be today or a future date.",
      },
    ),
  appointment_time: z
    .string()
    .regex(time24Pattern, "Appointment time must use 24-hour format (HH:mm)."),
  duration_minutes: z.number().int().min(1).nullable().optional(),
  price: z.number().min(0),
  status: appointmentStatusSchema.optional(),
  notes: z.string().nullable().optional(),
  cancellation_reason: z.string().nullable().optional(),
});

export const createAppointmentSchema = baseAppointmentSchema;

export const updateAppointmentSchema = baseAppointmentSchema;

export const cancellationReasonSchema = z.object({
  cancellation_reason: z
    .string()
    .trim()
    .max(500, "Cancellation reason must not exceed 500 characters.")
    .optional(),
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
