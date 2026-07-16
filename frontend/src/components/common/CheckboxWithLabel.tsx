"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CheckboxWithLabelProps = React.ComponentProps<typeof Checkbox> & {
  id: string;
  label: React.ReactNode;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
};

export function CheckboxWithLabel({
  id,
  label,
  error,
  containerClassName,
  labelClassName,
  ...props
}: CheckboxWithLabelProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-start gap-3",
          containerClassName,
        )}
      >
        <Checkbox
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : props["aria-describedby"]}
          {...props}
        />
        <Label
          htmlFor={id}
          className={cn(
            "cursor-pointer items-start text-sm leading-5 text-gray-700",
            labelClassName,
          )}
        >
          {label}
        </Label>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
