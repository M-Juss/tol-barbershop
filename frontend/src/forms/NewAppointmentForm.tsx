"use client";

import { DatePickerWithLabel } from "@/components/common/DatePickerWithLabel";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { SelectWithLabel } from "@/components/common/SelectWithLabel";

const serviceOptions = [
  { value: "classic-haircut", label: "Classic Haircut" },
  {
    value: "premium-haircut-beard-trim",
    label: "Premium Haircut + Beard Trim",
  },
  { value: "beard-styling", label: "Beard Styling" },
  { value: "hair-color-treatment", label: "Hair Color + Treatment" },
];

const barberOptions = [
  { value: "miguel-santos", label: "Miguel Santos" },
  { value: "ramon-villanueva", label: "Ramon Villanueva" },
  { value: "carlo-reyes", label: "Carlo Reyes" },
];

const timeOptions = [
  { value: "09:00-am", label: "9:00 AM" },
  { value: "10:00-am", label: "10:00 AM" },
  { value: "11:00-am", label: "11:00 AM" },
  { value: "01:00-pm", label: "1:00 PM" },
  { value: "02:00-pm", label: "2:00 PM" },
  { value: "03:30-pm", label: "3:30 PM" },
];

export function NewAppointmentForm() {
  return (
    <div className="w-full bg-slate-100 font-sans">
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <div className="col-span-2">
            <InputWithLabel
              id="full-name"
              label="Full Name"
              value="John Dela Cruz"
              disabled
              className="h-10 border-gray-200 text-gray-500"
            />
          </div>

          <InputWithLabel
            id="email"
            type="email"
            label="Email"
            value="john.delacruz@email.com"
            disabled
            className="h-10 border-gray-200 text-gray-500"
          />

          <InputWithLabel
            id="contact-number"
            label="Contact Number"
            value="+63 912 345 6789"
            disabled
            className="h-10 border-gray-200 text-gray-500"
          />

          <SelectWithLabel
            id="service"
            label="Service"
            placeholder="Select a service"
            options={serviceOptions}
          />

          <SelectWithLabel
            id="barber"
            label="Barber"
            placeholder="Select a barber"
            options={barberOptions}
          />

          <DatePickerWithLabel
            id="date"
            label="Date"
            placeholder="Pick a date"
          />

          <SelectWithLabel
            id="time"
            label="Time"
            placeholder="Select time"
            options={timeOptions}
          />

          <div className="col-span-2">
            <label
              htmlFor="notes"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Notes
            </label>
            <textarea
              id="notes"
              placeholder="Add notes for your barber (optional)"
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>
        </form>

        <div className="flex items-center gap-3 mt-8">
          <button className="flex-1 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold rounded-xl py-3 text-sm">
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
}
