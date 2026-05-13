export {
  getAppointments,
  createAppointment,
  updateAppointment,
  getActiveBarbers,
  getActiveServices,
} from "@/services/customer/appointment.api";

export type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentData,
  UpdateAppointmentData,
  Barber,
  Service,
} from "@/services/customer/appointment.api";
