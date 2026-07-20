"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DatePickerWithLabel } from "@/components/common/DatePickerWithLabel";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { SelectWithLabel } from "@/components/common/SelectWithLabel";
import { TextAreaWithLabel } from "@/components/common/TextAreaWithLabel";
import {
  getActiveBarbers,
  getActiveServices,
  getUnavailableSlots,
  getBookingSettings,
  createAppointment,
  createBatchAppointment,
  type Barber,
  type Service,
  type BookingSettings,
  type OccupiedAppointmentSlot,
} from "@/services/customer/appointment.api";
import {
  createAppointmentSchema,
  batchAppointmentSchema,
} from "@/validations/appointment.validation";
import { toast } from "sonner";
import { useRateLimit } from "@/hooks/useRateLimit";
import { sanitizeText } from "@/lib/sanitizer";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { generateTimeOptions, isTimeSlotUnavailable } from "@/lib/time-slots";

type BarberWithFallbackId = Barber & {
  user_id?: number | string | null;
  barber_user_id?: number | string | null;
};

function resolveBarberUserId(barber: BarberWithFallbackId): number | null {
  const rawId = barber.id ?? barber.user_id ?? barber.barber_user_id;
  const parsed = Number(rawId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function convert12HourTo24Hour(value: string): string {
  const match = value.match(/^(\d{1,2}):([0-5]\d)\s(AM|PM)$/i);
  if (!match) return value;
  const rawHours = Number(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  let hours = rawHours % 12;
  if (period === "PM") hours += 12;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isPastTime(time12hr: string, selectedDate: Date | undefined): boolean {
  if (!selectedDate) return false;
  const today = new Date();
  if (selectedDate.toDateString() !== today.toDateString()) return false;
  const match = time12hr.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/i);
  if (!match) return false;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hours += 12;
  const minutes = Number(match[2]);
  const slotTotalMinutes = hours * 60 + minutes;
  const nowTotalMinutes = today.getHours() * 60 + today.getMinutes();
  return slotTotalMinutes + 15 <= nowTotalMinutes;
}

function isUnavailableForService(
  time: string,
  serviceId: string,
  services: Service[],
  occupiedSlots: OccupiedAppointmentSlot[],
): boolean {
  const service = services.find((item) => item.id.toString() === serviceId);
  return isTimeSlotUnavailable(time, Number(service?.duration ?? 60), occupiedSlots);
}

export function NewAppointmentForm() {
  const router = useRouter();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [barbers, setBarbers] = useState<BarberWithFallbackId[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<BookingSettings | null>(null);

  const [mode, setMode] = useState<"single" | "group">("single");
  const [slotCount, setSlotCount] = useState(3);

  const [selectedBarber, setSelectedBarber] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [slotServices, setSlotServices] = useState<string[]>([]);
  const [slotTimes, setSlotTimes] = useState<string[]>([]);
  const [slotNames, setSlotNames] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedAppointmentSlot[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const rateLimit = useRateLimit({
    maxAttempts: 15,
    cooldownMinutes: 3,
    storageKey: "appointment_booking_rate_limit",
  });

  const timeOptions = settings
    ? generateTimeOptions(settings.opening_time, settings.closing_time, settings.slot_interval_minutes)
    : [];

  const selectedServiceData = services.find(
    (s) => s.id.toString() === selectedService,
  );
  const selectedServicePrice = Number(selectedServiceData?.price);
  const singleSubtotal = Number.isFinite(selectedServicePrice)
    ? selectedServicePrice
    : 0;

  const groupTotal = slotServices.reduce((sum, serviceId) => {
    const svc = services.find((s) => s.id.toString() === serviceId);
    return sum + (Number.isFinite(Number(svc?.price)) ? Number(svc!.price) : 0);
  }, 0);

  const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;

  useEffect(() => {
    if (authLoading) return;
    const fetchData = async () => {
      try {
        const [barbersData, servicesData, bookingSettings] = await Promise.all([
          getActiveBarbers(),
          getActiveServices(),
          getBookingSettings(),
        ]);

        const normalizedBarbers = barbersData
          .map((barber) => {
            const barberUserId = resolveBarberUserId(barber as BarberWithFallbackId);
            if (!barberUserId) return null;
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
        setSettings(bookingSettings);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load booking data");
      }
    };
    fetchData();
  }, [authLoading]);

  useEffect(() => {
    if (mode === "group" && authUser) {
      setSlotNames((prev) => {
        const updated = [authUser.fullname ?? "", ...prev.slice(1)];
        while (updated.length < slotCount) updated.push("");
        return updated.slice(0, slotCount);
      });
      setSlotServices((prev) => {
        while (prev.length < slotCount) prev.push("");
        return prev.slice(0, slotCount);
      });
      setSlotTimes((prev) => {
        while (prev.length < slotCount) prev.push("");
        return prev.slice(0, slotCount);
      });
    }
  }, [mode, slotCount, authUser]);

  useEffect(() => {
    const fetchUnavailableTimes = async () => {
      if (!selectedBarber || !selectedDate) {
        setOccupiedSlots([]);
        return;
      }
      try {
        setIsCheckingAvailability(true);
        const targetDate = formatDateForApi(selectedDate);
        const targetBarberId = Number(selectedBarber);
        const slots = await getUnavailableSlots(targetBarberId, targetDate);
        setOccupiedSlots(slots);
      } catch (error) {
        console.error("Failed to check appointment availability:", error);
        toast.error("Failed to check availability");
        setOccupiedSlots([]);
      } finally {
        setIsCheckingAvailability(false);
      }
    };
    fetchUnavailableTimes();
  }, [selectedBarber, selectedDate]);

  useEffect(() => {
    if (selectedTime && (isUnavailableForService(selectedTime, selectedService, services, occupiedSlots) || isPastTime(selectedTime, selectedDate))) {
      setSelectedTime("");
    }
  }, [selectedTime, selectedService, occupiedSlots, selectedDate, services]);

  const isSingleFormValid =
    selectedBarber && selectedService && selectedDate && selectedTime;

  const isGroupFormValid = (() => {
    if (!selectedBarber || !selectedDate) return false;
    if (!settings) return false;
    for (let i = 0; i < slotCount; i++) {
      if (i > 0 && !slotNames[i]?.trim()) return false;
      if (!slotServices[i]) return false;
      if (!slotTimes[i]) return false;
      if (isUnavailableForService(slotTimes[i], slotServices[i], services, occupiedSlots) || isPastTime(slotTimes[i], selectedDate)) return false;
    }
    const usedTimes = slotTimes.filter(Boolean);
    if (new Set(usedTimes).size !== usedTimes.length) return false;
    return true;
  })();

  const submitSingle = async () => {
    setFormError("");
    if (!isSingleFormValid) {
      setFormError("All fields are required");
      return;
    }
    if (!authUser) {
      alert("User profile not found. Please login again.");
      return;
    }
    if (!rateLimit.attempt()) return;

    try {
      setLoading(true);
      const selectedBarberData = barbers.find((b) => b.id.toString() === selectedBarber);
      const svc = services.find((s) => s.id.toString() === selectedService);
      if (!selectedBarberData || !svc) {
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
        service_id: svc.id,
        barber_user_id: barberUserId,
        appointment_date: formatDateForApi(selectedDate!),
        appointment_time: convert12HourTo24Hour(selectedTime),
        duration_minutes: svc.duration ? Number(svc.duration) : undefined,
        price: singleSubtotal,
        status: "pending" as const,
        notes: notes ? sanitizeText(notes) : undefined,
      };
      const validation = createAppointmentSchema.safeParse(payload);
      if (!validation.success) {
        setFormError(validation.error.issues[0]?.message ?? "Invalid appointment details.");
        return;
      }
      const apiPayload = {
        user_id: validation.data.user_id,
        service_id: validation.data.service_id,
        barber_user_id: validation.data.barber_user_id,
        appointment_date: validation.data.appointment_date,
        appointment_time: validation.data.appointment_time,
        duration_minutes: validation.data.duration_minutes === null ? undefined : validation.data.duration_minutes,
        price: validation.data.price,
        status: validation.data.status,
        notes: validation.data.notes === null ? undefined : validation.data.notes,
      } as {
        user_id: number;
        service_id: number;
        barber_user_id: number;
        appointment_date: string;
        appointment_time: string;
        duration_minutes?: number;
        price: number;
        status: "pending";
        notes?: string;
      };
      await createAppointment(apiPayload);
      toast.success("Booked successfully");
      rateLimit.reset();
      setSelectedBarber("");
      setSelectedService("");
      setSelectedDate(new Date());
      setSelectedTime("");
      setNotes("");
      setFormError("");
      router.push("/customer/history");
    } catch (error) {
      console.error("Failed to book appointment:", error);
      setFormError("Failed to book appointment");
      toast.error("Failed to book appointment");
    } finally {
      setLoading(false);
    }
  };

  const submitGroup = async () => {
    setFormError("");
    if (!isGroupFormValid) {
      setFormError("Please fill in all fields and ensure no time conflicts.");
      return;
    }
    if (!authUser) {
      alert("User profile not found. Please login again.");
      return;
    }
    if (!rateLimit.attempt()) return;

    try {
      setLoading(true);
      const selectedBarberData = barbers.find((b) => b.id.toString() === selectedBarber);
      if (!selectedBarberData) {
        alert("Invalid selection");
        return;
      }
      const barberUserId = resolveBarberUserId(selectedBarberData);
      if (!barberUserId) {
        setFormError("Selected barber has an invalid user ID.");
        return;
      }

      const appointments = slotServices.map((serviceId, i) => {
        const svc = services.find((s) => s.id.toString() === serviceId);
        return {
          customer_name: i === 0 ? null : (slotNames[i]?.trim() || null),
          service_id: Number(serviceId),
          appointment_time: convert12HourTo24Hour(slotTimes[i]),
          duration_minutes: svc?.duration ? Number(svc.duration) : undefined,
          price: Number.isFinite(Number(svc?.price)) ? Math.round(Number(svc!.price)) : 0,
        };
      });

      const payload = {
        barber_user_id: barberUserId,
        appointment_date: formatDateForApi(selectedDate!),
        notes: notes ? sanitizeText(notes) : null,
        appointments,
      };

      const validation = batchAppointmentSchema.safeParse(payload);
      if (!validation.success) {
        setFormError(validation.error.issues[0]?.message ?? "Invalid appointment details.");
        return;
      }

      await createBatchAppointment(validation.data);
      toast.success("Group booking submitted successfully");
      rateLimit.reset();
      setSelectedBarber("");
      setSelectedService("");
      setSelectedDate(new Date());
      setSelectedTime("");
      setNotes("");
      setSlotCount(3);
      setSlotServices([]);
      setSlotTimes([]);
      setSlotNames([]);
      setFormError("");
      router.push("/customer/history");
    } catch (error) {
      console.error("Failed to book group appointment:", error);
      setFormError("Failed to book group appointment");
      toast.error("Failed to book group appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleSlotNameChange = (index: number, value: string) => {
    setSlotNames((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSlotServiceChange = (index: number, value: string) => {
    setSlotServices((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSlotTimeChange = (index: number, value: string) => {
    setSlotTimes((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    void (mode === "single" ? submitSingle() : submitGroup());
  };

  return (
    <div className="w-full bg-slate-100 font-sans">
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition", mode === "single" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => setMode("group")}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition", mode === "group" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
          >
            Group
          </button>
        </div>

        <form
          id="appointment-booking-form"
          method="post"
          onSubmit={handleFormSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"
        >
          <div className="col-span-1 md:col-span-2">
            <InputWithLabel
              id="full-name"
              label="Full Name"
              value={authUser?.fullname ?? ""}
              disabled
              className="h-10 border-gray-200 text-gray-500"
            />
          </div>

          <div className="col-span-1 md:col-span-1">
            <InputWithLabel
              id="email"
              type="email"
              label="Email"
              value={authUser?.email ?? ""}
              disabled
              className="h-10 border-gray-200 text-gray-500"
            />
          </div>

          <div className="col-span-1 md:col-span-1">
            <InputWithLabel
              id="contact-number"
              label="Contact Number"
              value={authUser?.contact_number ?? ""}
              disabled
              className="h-10 border-gray-200 text-gray-500"
            />
          </div>

          {mode === "group" && settings && (
            <div className="col-span-1 md:col-span-2">
              <SelectWithLabel
                id="slot-count"
                label="How many total? (includes you)"
                placeholder="Select number"
                options={Array.from(
                  { length: settings.max_slots_per_booking - 1 },
                  (_, i) => ({
                    value: String(i + 2),
                    label: String(i + 2),
                  }),
                )}
                value={String(slotCount)}
                onValueChange={(value) => setSlotCount(Number(value))}
              />
            </div>
          )}

          <div className="col-span-1 md:col-span-1">
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
          </div>

          <div className="col-span-1 md:col-span-1">
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
          </div>

          {mode === "single" && (
            <>
              <div className="col-span-1 md:col-span-1">
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
              </div>

              <div className="col-span-1 md:col-span-1">
                <SelectWithLabel
                  id="time"
                  label="Time"
                  placeholder="Select time"
                  options={timeOptions.map((time) => ({
                    ...time,
                    disabled: isUnavailableForService(time.value, selectedService, services, occupiedSlots) || isPastTime(time.value, selectedDate),
                  }))}
                  value={selectedTime}
                  onValueChange={(value) => setSelectedTime(value)}
                  disabled={!selectedBarber || !selectedDate || isCheckingAvailability}
                />
              </div>
            </>
          )}

          {mode === "group" && (
            <div className="col-span-1 md:col-span-2 space-y-3">
              <p className="text-sm font-medium text-gray-700">Per Person</p>
              {Array.from({ length: slotCount }).map((_, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-[3fr_1fr_1fr] gap-3 items-end p-3 bg-gray-50 rounded-lg">
                  <InputWithLabel
                    id={`slot-name-${index}`}
                    label={index === 0 ? "You" : `Person ${index + 1}`}
                    value={slotNames[index] ?? (index === 0 ? authUser?.fullname ?? "" : "")}
                    onChange={(e) => {
                      if (index > 0) handleSlotNameChange(index, e.target.value);
                    }}
                    disabled={index === 0}
                    placeholder="Full name"
                    maxLength={255}
                    className={cn(
                      "h-10 border-gray-200",
                      index === 0
                        ? "bg-gray-100 text-gray-500"
                        : "bg-white text-gray-900",
                      "focus-visible:border-red-400 focus-visible:ring-red-100",
                    )}
                  />
                  <SelectWithLabel
                    id={`slot-service-${index}`}
                    label="Service"
                    placeholder="Select"
                    options={services.map((service) => ({
                      value: service.id.toString(),
                      label: service.name,
                    }))}
                    value={slotServices[index] ?? ""}
                    onValueChange={(value) => handleSlotServiceChange(index, value)}
                    disabled={!selectedBarber || !selectedDate}
                  />
                  <SelectWithLabel
                    id={`slot-time-${index}`}
                    label="Time"
                    placeholder="Select"
                    options={timeOptions.map((time) => ({
                      ...time,
                      disabled: isUnavailableForService(time.value, slotServices[index], services, occupiedSlots) || isPastTime(time.value, selectedDate),
                    }))}
                    value={slotTimes[index] ?? ""}
                    onValueChange={(value) => handleSlotTimeChange(index, value)}
                    disabled={!selectedBarber || !selectedDate || isCheckingAvailability}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="col-span-1 md:col-span-2">
            <TextAreaWithLabel
              id="notes"
              label="Notes"
              placeholder="Add notes for your barber (optional)"
              rows={4}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-gray-200 text-gray-900 focus-visible:border-red-400 focus-visible:ring-red-100"
            />
          </div>

          <div className="col-span-1 md:col-span-2 border-t border-gray-200 pt-4 space-y-3">
            {mode === "single" && selectedServiceData && (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{selectedServiceData.name}</p>
                  {selectedServiceData.description && (
                    <p className="text-sm text-muted-foreground truncate">{selectedServiceData.description}</p>
                  )}
                </div>
                <p className="shrink-0 font-medium text-gray-900">{formatCurrency(singleSubtotal)}</p>
              </div>
            )}

            {mode === "group" && (
              <div className="space-y-3">
                {Array.from({ length: slotCount }).map((_, index) => {
                  const svc = services.find((s) => s.id.toString() === slotServices[index]);
                  const slotName = slotNames[index] || (index === 0 ? "You" : `Person ${index + 1}`);
                  const slotPrice = Number.isFinite(Number(svc?.price)) ? Number(svc!.price) : 0;
                  return (
                    <div key={index} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{slotName}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {svc ? `${svc.name}${svc.description ? ` · ${svc.description}` : ""}` : "No service selected"}
                        </p>
                      </div>
                      <p className="shrink-0 font-medium text-gray-900">{formatCurrency(slotPrice)}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-gray-200 pt-3">
              <p className="font-semibold text-gray-900">Total</p>
              <p className="font-semibold text-gray-900">{formatCurrency(mode === "single" ? singleSubtotal : groupTotal)}</p>
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
            type="submit"
            form="appointment-booking-form"
            disabled={
              (mode === "single" ? !isSingleFormValid : !isGroupFormValid) || loading
            }
            className="flex-1 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Booking..."
              : mode === "single"
                ? "Book Appointment"
                : "Book Group Appointment"}
          </button>
        </div>

      </div>
    </div>
  );
}
