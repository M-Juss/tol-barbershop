"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TextAreaWithLabelProps = Omit<
  React.ComponentProps<"textarea">,
  "readOnly" | "disabled"
> & {
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export const TextAreaWithLabel = React.forwardRef<
  HTMLTextAreaElement,
  TextAreaWithLabelProps
>(
  (
    {
      id,
      label,
      placeholder,
      icon,
      disabled = false,
      rows = 4,
      ...props
    },
    ref,
  ) => {
    return (
      <div className="grid w-full gap-2">
        <Label htmlFor={id}>
          {icon}
          {label}
        </Label>
        <Textarea
          ref={ref}
          id={id}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          {...props}
        />
      </div>
    );
  },
);

TextAreaWithLabel.displayName = "TextAreaWithLabel";
