import { Clock, Edit, Trash2 } from "lucide-react";

export function TimeSlots({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-900">{label}</span>
      </div>
      <div className="flex gap-1">
        <button className="h-6 w-6 p-0 hover:bg-blue-100">
          <Edit className="w-4 h-4 text-blue-600" />
        </button>
        <button className="h-6 w-6 p-0 hover:bg-red-100">
          <Trash2 className="w-4 h-4 text-red-600 " />
        </button>
      </div>
    </div>
  );
}
