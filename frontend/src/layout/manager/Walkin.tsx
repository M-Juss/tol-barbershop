"use client";

import { useEffect, useState } from "react";
import { Users, Wallet } from "lucide-react";
import { WalkinForm } from "@/forms/WalkinForm";
import { StatCard } from "@/components/common/StatCard";
import {
  getWalkinStats,
  type WalkinStats as WalkinStatsType,
} from "@/services/manager/walkins.api";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function Walkin() {
  const [stats, setStats] = useState<WalkinStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getWalkinStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load walk-in stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="w-full bg-slate-100 p-4 sm:p-6 pb-12 sm:pb-10 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Walk-ins
        </h1>
        <p className="text-gray-500 mt-1">
          Record walk-in appointments
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard
          label="Total Walk-ins"
          value={loading ? "..." : (stats?.total_walkins ?? 0).toLocaleString()}
          icon={Users}
          iconContainerClassName="bg-blue-100"
          iconClassName="text-blue-500"
        />
        <StatCard
          label="Revenue"
          value={loading ? "..." : formatCurrency(stats?.total_revenue ?? 0)}
          icon={Wallet}
          iconContainerClassName="bg-green-100"
          iconClassName="text-green-500"
        />
      </div>

      <WalkinForm onSuccess={loadStats} />
    </div>
  );
}
