import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectWithLabelProps = {
  id: string;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
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
          className=" w-full border-gray-300 px-3 py-5 text-sm data-[placeholder]:text-muted-foreground"
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
