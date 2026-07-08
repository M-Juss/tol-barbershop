import { Calendar, X } from "lucide-react";

export function CloseDates({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between p-5 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-2">
        <p className="text-red-500">
          {" "}
          <Calendar size={20} />
        </p>
        <p className="font-semibold text-sm"> {label}</p>
      </div>
      <button className="text-red-600 hover:text-red-700 hover:bg-red-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
