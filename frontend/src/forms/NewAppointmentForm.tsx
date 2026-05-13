"use client";

import { useState, useEffect } from "react";
import { DatePickerWithLabel } from "@/components/common/DatePickerWithLabel";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { SelectWithLabel } from "@/components/common/SelectWithLabel";
import {
  getActiveBarbers,
  getActiveServices,
  getAppointments,
  createAppointment,
  type Appointment,
  type Barber,
  type Service,
} from "@/services/customer/appointment.api";
import { createAppointmentSchema } from "@/validations/appointment.validation";
import { toast } from "sonner";

const timeOptions = [
  { value: "9:00 AM", label: "9:00 AM" },
  { value: "10:00 AM", label: "10:00 AM" },
  { value: "11:00 AM", label: "11:00 AM" },
  { value: "12:00 PM", label: "12:00 PM" },
  { value: "1:00 PM", label: "1:00 PM" },
  { value: "2:00 PM", label: "2:00 PM" },
  { value: "3:00 PM", label: "3:00 PM" },
  { value: "4:00 PM", label: "4:00 PM" },
  { value: "5:00 PM", label: "5:00 PM" },
  { value: "6:00 PM", label: "6:00 PM" },
  { value: "7:00 PM", label: "7:00 PM" },
];

function convert12HourTo24Hour(value: string): string {
  const match = value.match(/^(\d{1,2}):([0-5]\d)\s(AM|PM)$/i);
  if (!match) return value;

  const rawHours = Number(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  let hours = rawHours % 12;
  if (period === "PM") {
    hours += 12;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

function convert24HourTo12Hour(value: string): string {
  const match = value.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return value;

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${minutes} ${period}`;
}

function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeApiDate(value: string): string {
  if (!value) return value;
  const base = value.includes("T") ? value.split("T")[0] : value;
  const parsed = new Date(base);
  if (Number.isNaN(parsed.getTime())) return base;
  return formatDateForApi(parsed);
}

type AuthUser = {
  id: number;
  fullname: string;
  email: string;
  contact_number: string;
};

type BarberWithFallbackId = Barber & {
  user_id?: number | string | null;
  barber_user_id?: number | string | null;
};

function resolveBarberUserId(barber: BarberWithFallbackId): number | null {
  const rawId = barber.id ?? barber.user_id ?? barber.barber_user_id;
  const parsed = Number(rawId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function NewAppointmentForm() {
  const [barbers, setBarbers] = useState<BarberWithFallbackId[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const selectedServiceData = services.find(
    (s) => s.id.toString() === selectedService,
  );
  const selectedServicePrice = Number(selectedServiceData?.price);
  const subtotal = Number.isFinite(selectedServicePrice) ? selectedServicePrice : 0;
  const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;

  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
      setAuthUser(JSON.parse(storedUser));
    }

    const fetchData = async () => {
      try {
        const [barbersData, servicesData] = await Promise.all([
          getActiveBarbers(),
          getActiveServices(),
        ]);

        const normalizedBarbers = barbersData
          .map((barber) => {
            const barberUserId = resolveBarberUserId(
              barber as BarberWithFallbackId,
            );

            if (!barberUserId) {
              return null;
            }

            return {
              ...(barber as BarberWithFallbackId),
              id: barberUserId,
            };
          })
          .filter(
            (barber): barber is BarberWithFallbackId =>
              barber !== null && barber.is_active,
          );

        setBarbers(normalizedBarbers);
        setServices(servicesData.filter((service) => service.is_active));
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchUnavailableTimes = async () => {
      if (!selectedBarber || !selectedDate) {
        setUnavailableTimes([]);
        return;
      }

      try {
        setIsCheckingAvailability(true);
        const appointments = await getAppointments();
        const targetDate = formatDateForApi(selectedDate);
        const targetBarberId = Number(selectedBarber);

        const blocked = appointments
          .filter((appointment: Appointment) => {
            const appointmentBarberId = appointment.barber.id;
            return (
              appointmentBarberId === targetBarberId &&
              normalizeApiDate(appointment.appointment_date) === targetDate &&
              (appointment.status === "pending" ||
                appointment.status === "approved")
            );
          })
          .map((appointment: Appointment) =>
            convert24HourTo12Hour(appointment.appointment_time),
          );

        setUnavailableTimes(blocked);
      } catch (error) {
        console.error("Failed to check appointment availability:", error);
        setUnavailableTimes([]);
      } finally {
        setIsCheckingAvailability(false);
      }
    };

    fetchUnavailableTimes();
  }, [selectedBarber, selectedDate]);

  useEffect(() => {
    if (selectedTime && unavailableTimes.includes(selectedTime)) {
      setSelectedTime("");
    }
  }, [selectedTime, unavailableTimes]);

  const isFormValid =
    selectedBarber && selectedService && selectedDate && selectedTime;

  const submitAppointment = async () => {
    setFormError("");

    if (!isFormValid) {
      alert("Please fill in all required fields");
      return;
    }

    if (!authUser) {
      alert("User profile not found. Please login again.");
      return;
    }

    try {
      setLoading(true);

      const selectedBarberData = barbers.find(
        (b) => b.id.toString() === selectedBarber,
      );
      const selectedServiceData = services.find(
        (s) => s.id.toString() === selectedService,
      );

      if (!selectedBarberData || !selectedServiceData) {
        alert("Invalid selection");
        return;
      }

      const barberUserId = resolveBarberUserId(selectedBarberData);
      if (!barberUserId) {
        setFormError("Selected barber has an invalid user ID.");
        return;
      }

      const payload = {
        user_id: authUser.id,
        service_id: selectedServiceData.id,
        barber_user_id: barberUserId,
        appointment_date: formatDateForApi(selectedDate!),
        appointment_time: convert12HourTo24Hour(selectedTime),
        duration_minutes: selectedServiceData.duration,
        price: subtotal,
        status: "pending",
        notes: notes || null,
      };

      const validation = createAppointmentSchema.safeParse(payload);
      if (!validation.success) {
        setFormError(validation.error.issues[0]?.message ?? "Invalid appointment details.");
        return;
      }

      await createAppointment(validation.data);

      toast.success("Appointment booked successfully!");
      setSelectedBarber("");
      setSelectedService("");
      setSelectedDate(new Date());
      setSelectedTime("");
      setNotes("");
      setFormError("");
    } catch (error) {
      console.error("Failed to book appointment:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to book appointment",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-100 font-sans">
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <div className="col-span-2">
            <InputWithLabel
              id="full-name"
              label="Full Name"
              value={authUser?.fullname ?? ""}
              disabled
              className="h-10 border-gray-200 text-gray-500"
            />
          </div>

          <InputWithLabel
            id="email"
            type="email"
            label="Email"
            value={authUser?.email ?? ""}
            disabled
            className="h-10 border-gray-200 text-gray-500"
          />

          <InputWithLabel
            id="contact-number"
            label="Contact Number"
            value={authUser?.contact_number ?? ""}
            disabled
            className="h-10 border-gray-200 text-gray-500"
          />

          <SelectWithLabel
            id="service"
            label="Service"
            placeholder="Select a service"
            options={services.map((service) => ({
              value: service.id.toString(),
              label: service.name,
            }))}
            value={selectedService}
            onValueChange={(value) => setSelectedService(value)}
          />

          <SelectWithLabel
            id="barber"
            label="Barber"
            placeholder="Select a barber"
            options={barbers.map((barber) => ({
              value: barber.id.toString(),
              label: barber.fullname,
            }))}
            value={selectedBarber}
            onValueChange={(value) => setSelectedBarber(value)}
          />

          <DatePickerWithLabel
            id="date"
            label="Date"
            placeholder="Pick a date"
            disablePastDates={true}
            maxDaysAhead={30}
            disableSundays={true}
            date={selectedDate}
            onDateChange={(date) => setSelectedDate(date)}
            disabled={!selectedBarber}
          />

          <SelectWithLabel
            id="time"
            label="Time"
            placeholder="Select time"
            options={timeOptions.map((time) => ({
              ...time,
              disabled: unavailableTimes.includes(time.value),
            }))}
            value={selectedTime}
            onValueChange={(value) => setSelectedTime(value)}
            disabled={!selectedBarber || !selectedDate || isCheckingAvailability}
          />

          <div className="col-span-2">
            <label
              htmlFor="notes"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Notes
            </label>
            <textarea
              id="notes"
              placeholder="Add notes for your barber (optional)"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div className="col-span-2 border-t border-gray-200 pt-4">
            <div className="space-y-2 text-gray-700">
              <div className="flex items-center justify-between text-2xl">
                <span className="font-semibold">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-4xl pt-1">
                <span className="font-extrabold text-black">Total:</span>
                <span className="font-extrabold text-amber-600">
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center gap-3 mt-8">
          {formError ? (
            <p className="text-sm text-red-500">{formError}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <button
            type="button"
            disabled={!isFormValid || loading}
            onClick={submitAppointment}
            className="flex-1 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Booking..." : "Book Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}
