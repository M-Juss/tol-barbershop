import { Suspense } from "react";

import { FeedbackList } from "@/layout/manager/FeedbackList";

export default function AdminFeedbackPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading feedback...</div>}>
      <FeedbackList />
    </Suspense>
  );
}
