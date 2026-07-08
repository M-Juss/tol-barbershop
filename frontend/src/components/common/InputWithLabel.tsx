import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InputWithLabelProps = Omit<
  React.ComponentProps<"input">,
  "readOnly" | "disabled"
> & {
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export const InputWithLabel = React.forwardRef<
  HTMLInputElement,
  InputWithLabelProps
>(
  (
    { id, label, placeholder, icon, type = "text", disabled = false, ...props },
    ref,
  ) => {
    return (
      <div className="grid w-full gap-2">
        <Label htmlFor={id}>
          {icon}
          {label}
        </Label>
        <Input
          ref={ref}
          id={id}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          {...props}
        />
      </div>
    );
  },
);

InputWithLabel.displayName = "InputWithLabel";
