
"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch, type SubmitErrorHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";

import { DatePickerWithLabel } from "@/components/common/DatePickerWithLabel";
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
  closedDateSchema,
  ClosedDateSchemaFormValues,
} from "@/validations/closed.date.validation";
import { sanitizeText } from "@/lib/sanitizer";
import { checkClosedDateConflicts } from "@/services/manager/close.date.api";
import { toast } from "sonner";

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
  title = "Add Closed Date",
}: ClosedDateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    control,
  } = useForm<ClosedDateSchemaFormValues>({
    resolver: zodResolver(closedDateSchema),
    defaultValues: {
      date_closed: undefined,
      reason: "",
    },
  });
  const dateClosed = useWatch({ control, name: "date_closed" });
  const [conflictCount, setConflictCount] = useState(0);

  useEffect(() => {
    if (initialData) {
      reset({
        date_closed: initialData.date_closed,
        reason: initialData.reason ?? "",
      });
    } else {
      reset({
        date_closed: undefined,
        reason: "",
      });
    }
  }, [initialData, open, reset]);

  useEffect(() => {
    if (!dateClosed || !(dateClosed instanceof Date)) {
      return;
    }

    const dateStr =
      dateClosed.getFullYear() +
      "-" +
      String(dateClosed.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(dateClosed.getDate()).padStart(2, "0");
    let cancelled = false;

    checkClosedDateConflicts(dateStr)
      .then((result) => {
        if (!cancelled) setConflictCount(result.count);
      })
      .catch(() => {
        if (!cancelled) setConflictCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [dateClosed]);

  const onFormInvalid: SubmitErrorHandler<ClosedDateSchemaFormValues> = () => {
    toast.error("All fields are required");
  };

  const onFormSubmit = async (data: ClosedDateSchemaFormValues) => {
    const sanitized = {
      ...data,
      reason: sanitizeText(data.reason),
    };
    await onSubmit?.(sanitized);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm mt-0.5">
            Set the date and reason for closure
          </DialogDescription>
        </DialogHeader>

        <form
          method="post"
          onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
          className="space-y-5"
        >
          <div className="relative ">
            <DatePickerWithLabel
              id="date_closed"
              label="Closed Date"
              placeholder="Select closure date"
              date={dateClosed}
              onDateChange={(date) => {
                setValue("date_closed", date as Date, {
                  shouldValidate: true,
                });
                if (!date) setConflictCount(0);
              }}
            />
            {errors.date_closed && (
              <p className="absolute left-0 top-full  text-red-500 text-xs">
                Date is required
              </p>
            )}
          </div>

          <div className="relative ">
            <TextAreaWithLabel
              id="reason"
              label="Reason"
              placeholder="Enter reason for closure..."
              maxLength={500}
              className="border-gray-300 focus:border-gray-400"
              {...register("reason")}
            />
            {errors.reason && (
              <p className="absolute left-0 top-full mt-1 text-red-500 text-xs">{errors.reason.message}</p>
            )}
          </div>

          {conflictCount > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                {conflictCount} active appointment{conflictCount > 1 ? "s" : ""} exist on this date. Affected customers will be notified of the closure.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isSubmitting
                ? "Saving..."
                : initialData
                  ? "Update Closed Date"
                  : "Add Closed Date"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
