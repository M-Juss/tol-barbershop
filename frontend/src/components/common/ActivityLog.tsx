import { Activity } from "lucide-react";

type ActivityLogProps = {
  action: string;
  details: string;
  time: string;
};

export function ActivityLog({ action, details, time }: ActivityLogProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="p-2 bg-white rounded-lg border border-gray-200">
        <Activity className="w-4 h-4 text-gray-600" />
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-gray-900">{action}</p>
            <p className="text-sm text-gray-600 mt-1">{details}</p>
          </div>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
      </div>
    </div>
  );
}
