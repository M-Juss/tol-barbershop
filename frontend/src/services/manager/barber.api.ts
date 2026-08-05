import { authFetch } from "@/lib/api";
import { invalidateRequestCache } from "@/lib/request-cache";

export interface Barber {
  id: number;
  fullname: string;
  email: string;
  contact_number: string;
  image: string;
  is_active?: boolean;
}

export interface CreateBarberData {
  fullname: string;
  email: string;
  contact_number: string;
  is_active?: boolean;
}

export const getBarbers = async (): Promise<Barber[]> => {
  const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/barber`);
  return response.data;
};

export const createBarber = async (data: CreateBarberData): Promise<void> => {
  const formData = new FormData();
  formData.append("fullname", data.fullname);
  formData.append("email", data.email);
  formData.append("contact_number", data.contact_number);
  formData.append("is_active", data.is_active ? "1" : "0");

  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/barber`, {
    method: "POST",
    body: formData,
  });
  invalidateRequestCache("barbers:");
};

export const updateBarber = async (
  id: number,
  data: CreateBarberData,
): Promise<void> => {
  const formData = new FormData();
  formData.append("fullname", data.fullname);
  formData.append("email", data.email);
  formData.append("contact_number", data.contact_number);
  formData.append("is_active", data.is_active ? "1" : "0");
  formData.append("_method", "PUT");

  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/barber/${id}`, {
    method: "POST",
    body: formData,
  });
  invalidateRequestCache("barbers:");
};

export const deleteBarber = async (id: number): Promise<void> => {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/barber/${id}`, {
    method: "DELETE",
  });
  invalidateRequestCache("barbers:");
};
