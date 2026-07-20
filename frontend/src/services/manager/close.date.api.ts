import { authFetch } from "@/lib/api";

export interface ClosedDate {
  id: number;
  date_closed: string;
  reason: string;
  is_removed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClosedDateData {
  date_closed: string;
  reason: string;
}

export interface UpdateClosedDateData {
  date_closed?: string;
  reason?: string;
  is_removed?: boolean;
}

export interface PaginatedClosedDates {
  data: ClosedDate[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const getClosedDates = async (
  page: number = 1,
  perPage: number = 5,
): Promise<PaginatedClosedDates> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/closed-dates?page=${page}&per_page=${perPage}`,
  );

  const paginatedData = response.data;

  return {
    data: paginatedData?.data || [],
    current_page: paginatedData?.current_page || 1,
    last_page: paginatedData?.last_page || 1,
    per_page: paginatedData?.per_page || perPage,
    total: paginatedData?.total || 0,
  };
};

export const createClosedDate = async (
  data: CreateClosedDateData,
): Promise<void> => {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/closed-dates`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateClosedDate = async (
  id: number,
  data: UpdateClosedDateData,
): Promise<ClosedDate> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/closed-dates/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
  return response.data;
};

export const getAllClosedDatesForActivityLog = async (
  page: number = 1,
  perPage: number = 5,
): Promise<PaginatedClosedDates> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/closed-dates?page=${page}&per_page=${perPage}&all=true`,
  );

  const paginatedData = response.data;

  return {
    data: paginatedData?.data || [],
    current_page: paginatedData?.current_page || 1,
    last_page: paginatedData?.last_page || 1,
    per_page: paginatedData?.per_page || perPage,
    total: paginatedData?.total || 0,
  };
};

export const checkClosedDateConflicts = async (
  date: string,
): Promise<{ count: number }> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/closed-dates/check-conflicts?date=${date}`,
  );
  return response.data?.data ?? { count: 0 };
};
