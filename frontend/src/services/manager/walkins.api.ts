import { authFetch } from "@/lib/api";

export interface WalkinStats {
  total_walkins: number;
  total_revenue: number;
}

const API = process.env.NEXT_PUBLIC_API_URL;

export const getWalkinStats = async (): Promise<WalkinStats> => {
  const response = await authFetch(`${API}/walkins/stats`);
  return response.data as WalkinStats;
};
