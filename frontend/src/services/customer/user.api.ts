import { authFetch } from "@/lib/api";

export interface AuthUser {
  id: number;
  fullname: string;
  email: string;
  contact_number: string;
  role: string;
}

export interface ChangeInformationPayload {
  fullname: string;
  email: string;
  contact_number: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export const changeInformation = async (
  data: ChangeInformationPayload,
): Promise<AuthUser> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/change-information`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );

  return response.data;
};

export const changePassword = async (
  data: ChangePasswordPayload,
): Promise<void> => {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/change-password`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const deleteAccount = async (): Promise<void> => {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/account`, {
    method: "DELETE",
  });
};
