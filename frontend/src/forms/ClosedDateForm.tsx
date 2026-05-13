
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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

interface ClosedDateFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: ClosedDateSchemaFormValues) => void | Promise<void>;
  initialData?: ClosedDateSchemaFormValues;
  title?: string;
}

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
    watch,
  } = useForm<ClosedDateSchemaFormValues>({
    resolver: zodResolver(closedDateSchema),
    defaultValues: {
      date_closed: undefined,
      reason: "",
    },
  });

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

  const onFormSubmit = async (data: ClosedDateSchemaFormValues) => {
    await onSubmit?.(data);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:w-lg w-[40vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm mt-0.5">
            Set the date and reason for closure
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <DatePickerWithLabel
              id="date_closed"
              label="Closed Date"
              placeholder="Select closure date"
              date={watch("date_closed")}
              onDateChange={(date) =>
                setValue("date_closed", date as Date, {
                  shouldValidate: true,
                })
              }
            />
            {errors.date_closed && (
              <p className="text-red-500 text-xs">
                {errors.date_closed.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <TextAreaWithLabel
              id="reason"
              label="Reason"
              placeholder="Enter reason for closure..."
              className="border-gray-300 focus:border-gray-400"
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-red-500 text-xs">{errors.reason.message}</p>
            )}
          </div>

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
