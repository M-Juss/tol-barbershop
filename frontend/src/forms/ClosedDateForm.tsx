"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type SubmitErrorHandler } from "react-hook-form";
import { toast } from "sonner";

import { DatePickerWithLabel } from "@/components/common/DatePickerWithLabel";
import { SelectWithLabel } from "@/components/common/SelectWithLabel";
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
import { sanitizeText } from "@/lib/sanitizer";
import { getBarbers, type Barber } from "@/services/manager/barber.api";
import {
  closedDateSchema,
  type ClosedDateSchemaFormValues,
} from "@/validations/closed.date.validation";

type ClosedDateFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: ClosedDateSchemaFormValues) => void | Promise<void>;
  initialData?: ClosedDateSchemaFormValues;
  title?: string;
};

export function ClosedDateForm({
  open,
  onClose,
  onSubmit,
  initialData,
  title,
}: ClosedDateFormProps) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    resetField,
    setValue,
    control,
  } = useForm<ClosedDateSchemaFormValues>({
    resolver: zodResolver(closedDateSchema),
    defaultValues: {
      date_closed: undefined,
      closure_scope: "shop",
      barber_user_id: null,
      reason: "",
    },
  });
  const dateClosed = useWatch({ control, name: "date_closed" });
  const closureScope = useWatch({ control, name: "closure_scope" });
  const barberUserId = useWatch({ control, name: "barber_user_id" });
  const isBarberDayOff = closureScope === "barber";

  useEffect(() => {
    if (!open) return;

    getBarbers()
      .then((items) => setBarbers(items.filter((barber) => barber.is_active)))
      .catch(() => toast.error("Could not load barbers"));
  }, [open]);

  useEffect(() => {
    if (initialData) {
      reset(initialData);
      return;
    }

    reset({
      date_closed: undefined,
      closure_scope: "shop",
      barber_user_id: null,
      reason: "",
    });
  }, [initialData, open, reset]);

  const switchClosureScope = () => {
    const nextScope = isBarberDayOff ? "shop" : "barber";
    setValue("closure_scope", nextScope, { shouldValidate: true });
    setValue("barber_user_id", null, { shouldValidate: false });
    resetField("date_closed");
  };

  const onFormInvalid: SubmitErrorHandler<ClosedDateSchemaFormValues> = () => {
    toast.error("All fields are required");
  };

  const onFormSubmit = async (data: ClosedDateSchemaFormValues) => {
    await onSubmit?.({
      ...data,
      barber_user_id:
        data.closure_scope === "barber" ? data.barber_user_id : null,
      reason: sanitizeText(data.reason),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 sm:text-2xl">
            {title ?? (isBarberDayOff ? "Add Barber Day Off" : "Add Closed Date")}
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-sm text-gray-500">
            {isBarberDayOff
              ? "Make one barber unavailable for a specific date"
              : "Close the entire shop for a specific date"}
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={switchClosureScope}
          className="w-fit text-left text-sm font-medium text-blue-600 underline-offset-4 hover:underline"
        >
          {isBarberDayOff
            ? "Close the entire shop instead."
            : "Only one barber is unavailable? Set a barber day off."}
        </button>

        <form
          method="post"
          onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
          className="space-y-5"
        >
          {isBarberDayOff && (
            <div className="relative">
              <SelectWithLabel
                id="barber_user_id"
                label="Barber"
                placeholder="Select a barber"
                options={barbers.map((barber) => ({
                  value: barber.id.toString(),
                  label: barber.fullname,
                }))}
                value={barberUserId ? String(barberUserId) : ""}
                onValueChange={(value) => {
                  setValue("barber_user_id", Number(value), {
                    shouldValidate: true,
                  });
                  resetField("date_closed");
                }}
              />
              {errors.barber_user_id && (
                <p className="absolute left-0 top-full mt-1 text-xs text-red-500">
                  {errors.barber_user_id.message}
                </p>
              )}
            </div>
          )}

          <div className="relative">
            <DatePickerWithLabel
              id="date_closed"
              label="Closed Date"
              placeholder="Select closure date"
              date={dateClosed}
              disablePastDates
              barberId={isBarberDayOff ? barberUserId ?? undefined : undefined}
              disabled={isBarberDayOff && !barberUserId}
              onDateChange={(date) => {
                setValue("date_closed", date as Date, {
                  shouldValidate: true,
                });
              }}
            />
            {errors.date_closed && (
              <p className="absolute left-0 top-full text-xs text-red-500">
                {errors.date_closed.message}
              </p>
            )}
          </div>

          <div className="relative">
            <TextAreaWithLabel
              id="reason"
              label="Internal Reason"
              placeholder="Enter the internal reason..."
              maxLength={255}
              className="border-gray-300 focus:border-gray-400"
              {...register("reason")}
            />
            {errors.reason && (
              <p className="absolute left-0 top-full mt-1 text-xs text-red-500">
                {errors.reason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isSubmitting
                ? "Saving..."
                : isBarberDayOff
                  ? "Add Barber Day Off"
                  : "Add Closed Date"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
