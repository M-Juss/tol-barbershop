import { authFetch } from "@/lib/api";

export interface Admin {
  id: number;
  fullname: string;
  email: string;
  contact_number: string;
  image: string;
  is_active?: boolean;
}

export interface CreateAdminData {
  fullname: string;
  email: string;
  contact_number: string;
  image?: File;
  is_active?: boolean;
}

export const getAdmins = async (): Promise<Admin[]> => {
  const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/admin`);
  return response.data;
};

export const createAdmin = async (data: CreateAdminData): Promise<void> => {
  const formData = new FormData();
  formData.append("fullname", data.fullname);
  formData.append("email", data.email);
  formData.append("contact_number", data.contact_number);
  formData.append("is_active", data.is_active ? "1" : "0");
  if (data.image) {
    formData.append("image", data.image);
  }

  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/admin`, {
    method: "POST",
    body: formData,
  });
};

export const updateAdmin = async (
  id: number,
  data: CreateAdminData,
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

  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/${id}`, {
    method: "POST",
    body: formData,
  });
};

export const deleteAdmin = async (id: number): Promise<void> => {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/${id}`, {
    method: "DELETE",
  });
};
