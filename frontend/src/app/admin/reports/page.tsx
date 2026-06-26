"use client";

import { BarChart3 } from "lucide-react";

export default function AdminReportsPage() {
  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">View reports and analytics</p>
      </div>
      <div className="bg-white rounded-xl p-6 sm:p-12 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-500">Coming Soon</h2>
        <p className="text-gray-400 mt-1">Reports feature is under development.</p>
      </div>
    </div>
  );
}
