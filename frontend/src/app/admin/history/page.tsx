import { Suspense } from "react";

import { Historical } from "@/layout/manager/Historical";

export default function AdminHistoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading appointment history...</div>}>
      <Historical />
    </Suspense>
  );
}
