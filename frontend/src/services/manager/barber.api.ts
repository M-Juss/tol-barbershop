import { authFetch } from "@/lib/api";

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
  image?: File;
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
  if (data.image) {
    formData.append("image", data.image);
  }

  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/barber`, {
    method: "POST",
    body: formData,
  });
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
  if (data.image) {
    formData.append("image", data.image);
  }
  formData.append("_method", "PUT");

  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/barber/${id}`, {
    method: "POST",
    body: formData,
  });
};

export const deleteBarber = async (id: number): Promise<void> => {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/barber/${id}`, {
    method: "DELETE",
  });
};
