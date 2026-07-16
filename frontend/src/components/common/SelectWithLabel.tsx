import type React from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectWithLabelProps = {
  id: string;
  label: React.ReactNode;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  triggerClassName?: string;
};

export function SelectWithLabel({
  id,
  label,
  placeholder = "Select an option",
  options,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  triggerClassName,
}: SelectWithLabelProps) {
  return (
    <div className="grid w-full gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={cn(
            "w-full border-gray-300 px-3 py-5 text-sm data-[placeholder]:text-muted-foreground",
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent align="start" position="popper" className="w-[var(--radix-select-trigger-width)] z-[60]">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
