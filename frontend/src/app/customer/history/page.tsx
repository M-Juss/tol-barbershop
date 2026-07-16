import { Suspense } from "react";

import { MyAppointment } from "@/layout/customer/MyAppointment";

export default function CustomerHistoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading appointment history...</div>}>
      <MyAppointment />
    </Suspense>
  );
}
