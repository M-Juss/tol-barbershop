import { authFetch } from "@/lib/api";
import { invalidateRequestCache } from "@/lib/request-cache";

export interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  is_active?: boolean;
}

export interface CreateServiceData {
  name: string;
  description: string;
  duration: number;
  price: number;
  is_active?: boolean;
}

export const getServices = async (): Promise<Service[]> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/services`,
  );
  return response.data.services;
};

export const createService = async (data: CreateServiceData): Promise<void> => {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/services`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  invalidateRequestCache("services:");
};

export const updateService = async (id: number, data: CreateServiceData): Promise<void> => {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  invalidateRequestCache("services:");
};

export const deleteService = async (id: number): Promise<void> => {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${id}`, {
    method: 'DELETE',
  });
  invalidateRequestCache("services:");
};
