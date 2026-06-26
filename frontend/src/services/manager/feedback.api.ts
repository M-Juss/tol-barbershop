import { authFetch } from "@/lib/api";

export interface FeedbackItem {
  id: number;
  appointment_id: number;
  rating: number;
  comment: string | null;
  customer_name: string;
  customer_initials: string;
  service_name: string;
  submitted_at: string;
}

export interface FeedbackMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface FeedbackResponse {
  feedback: FeedbackItem[];
  meta: FeedbackMeta;
}

export interface FeedbackFilters {
  search?: string;
  rating?: string;
  sort?: string;
  dir?: string;
  page?: number;
  per_page?: number;
}

const API = process.env.NEXT_PUBLIC_API_URL;

export const getFeedbackList = async (filters: FeedbackFilters = {}): Promise<FeedbackResponse> => {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.rating) params.set("rating", filters.rating);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.dir) params.set("dir", filters.dir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));

  const qs = params.toString();
  const response = await authFetch(`${API}/feedback${qs ? `?${qs}` : ""}`);
  return response.data as FeedbackResponse;
};
