"use client";

import { useEffect } from "react";
import { useForm, type SubmitErrorHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Clock, User, Mail, Phone, Scissors } from "lucide-react";
import { formatBookingId } from "@/lib/booking";

import { TextAreaWithLabel } from "@/components/common/TextAreaWithLabel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cancellationReasonSchema,
  CancellationReasonSchemaFormValues,
} from "@/validations/appointment.validation";
import { type Appointment } from "@/services/customer/appointment.api";
import { sanitizeText } from "@/lib/sanitizer";
import { toast } from "sonner";

type CancellationFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: CancellationReasonSchemaFormValues) => void | Promise<void>;
  appointment: Appointment;
  mode?: "cancel" | "reject";
}

function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function CancellationForm({
  open,
  onClose,
  onSubmit,
  appointment,
  mode = "cancel",
}: CancellationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CancellationReasonSchemaFormValues>({
    resolver: zodResolver(cancellationReasonSchema),
    defaultValues: {
      cancellation_reason: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        cancellation_reason: "",
      });
    }
  }, [open, reset]);

  const onFormInvalid: SubmitErrorHandler<CancellationReasonSchemaFormValues> = () => {
    toast.error("All fields are required");
  };

  const onFormSubmit = async (data: CancellationReasonSchemaFormValues) => {
    const sanitized = {
      ...data,
      cancellation_reason: data.cancellation_reason ? sanitizeText(data.cancellation_reason) : undefined,
    };
    await onSubmit?.(sanitized);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
            {mode === "reject" ? "Reject Appointment" : "Cancel Appointment"}
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm mt-0.5">
            {mode === "reject"
              ? "Review booking details and add a rejection reason if needed"
              : "Review booking details and add a cancellation reason if needed"}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500">Booking ID:</span>
            <span className="text-xs font-bold text-gray-900">{formatBookingId(appointment.id)}</span>
          </div>

          <div className="border-t border-gray-200" />

          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">
              {appointment.customer.fullname}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-600">{appointment.customer.email}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-600">{appointment.customer.contact_number}</span>
          </div>

          <div className="border-t border-gray-200" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600">
                <span className="font-medium text-gray-800">Service:</span>{" "}
                {appointment.service.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600">
                <span className="font-medium text-gray-800">Barber:</span>{" "}
                {appointment.barber.fullname}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600">
                <span className="font-medium text-gray-800">Date:</span>{" "}
                {formatShortDate(appointment.appointment_date)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600">
                <span className="font-medium text-gray-800">Time:</span>{" "}
              {formatTime(appointment.appointment_time)}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit, onFormInvalid)} className="space-y-5">
          <div className="relative ">
            <TextAreaWithLabel
              id="cancellation_reason"
              label={mode === "reject" ? "Rejection Reason (Optional)" : "Cancellation Reason (Optional)"}
              placeholder={mode === "reject" ? "Add a reason for rejection (optional)..." : "Add a reason for cancellation (optional)..."}
              rows={4}
              className="border-gray-300 focus:border-gray-400"
              {...register("cancellation_reason")}
            />
            {errors.cancellation_reason && (
              <p className="absolute left-0 top-full mt-1 text-red-500 text-xs">{errors.cancellation_reason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Back
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isSubmitting
                ? mode === "reject" ? "Rejecting..." : "Cancelling..."
                : mode === "reject" ? "Reject Appointment" : "Cancel Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
