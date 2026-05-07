"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type DatePickerWithLabelProps = {
  id: string;
  label: string;
  placeholder?: string;
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
};

export function DatePickerWithLabel({
  id,
  label,
  placeholder = "Select date",
  date,
  onDateChange,
}: DatePickerWithLabelProps) {
    
  const [open, setOpen] = useState(false);
  const [internalDate, setInternalDate] = useState<Date | undefined>(undefined);

  const selectedDate = date ?? internalDate;

  const { today, maxDate } = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const max = new Date(start);
    max.setDate(start.getDate() + 30);

    return { today: start, maxDate: max };
  }, []);

  function handleDateSelect(nextDate: Date | undefined) {
    if (date === undefined) {
      setInternalDate(nextDate);
    }
    onDateChange?.(nextDate);
    setOpen(false);
  }

  return (
    <div className="grid w-full gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
          >

\][';l.,']            className="w-full bg-white py-5 justify-between border-gray-300 px-3 font-normal"
            <span className={selectedDate ? "text-foreground" : "text-muted-foreground"}>
              {selectedDate ? selectedDate.toLocaleDateString() : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(day) => day < today || day > maxDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
