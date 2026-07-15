import { authFetch } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL;

export const getPendingAppointmentCount = async (
  signal?: AbortSignal,
): Promise<number> => {
  const res = await authFetch(`${API}/appointments/pending-count`, { signal });
  return res.data?.count ?? 0;
};

export interface Admin {
  id: number;
  fullname: string;
  email: string;
  contact_number: string;
  image: string;
  is_active?: boolean;
  role_id?: number | null;
  role_name?: string | null;
}

export interface CreateAdminData {
  fullname: string;
  email: string;
  contact_number: string;
  password?: string;
  confirm_password?: string;
  is_active?: boolean;
  role_id?: number | null;
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
  if (data.password) {
    formData.append("password", data.password);
  }
  if (data.confirm_password) {
    formData.append("password_confirmation", data.confirm_password);
  }
  formData.append("is_active", data.is_active ? "1" : "0");
  if (data.role_id != null) {
    formData.append("role_id", String(data.role_id));
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
  if (data.password) {
    formData.append("password", data.password);
  }
  if (data.confirm_password) {
    formData.append("password_confirmation", data.confirm_password);
  }
  formData.append("is_active", data.is_active ? "1" : "0");
  if (data.role_id != null) {
    formData.append("role_id", String(data.role_id));
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
