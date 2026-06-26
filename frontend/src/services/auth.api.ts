import { publicFetch, authFetch } from "@/lib/api";

export const registerCustomerRequest = async (data: {
  fullname: string;
  contact_number: string;
  email: string;
  password: string;
  password_confirmation: string;
}) => {
  return publicFetch(`${process.env.NEXT_PUBLIC_API_URL}/register`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const loginRequest = async (data: {
  email: string;
  password: string;
}) => {
  return publicFetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const logoutRequest = async () => {
  return authFetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
    method: "POST",
  });
};

export const getCurrentUserRequest = async () => {
  return authFetch(`${process.env.NEXT_PUBLIC_API_URL}/user`);
};

export const forgotPasswordRequest = async (data: { email: string }) => {
  return publicFetch(`${process.env.NEXT_PUBLIC_API_URL}/forgot-password`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const resetPasswordRequest = async (data: {
  password: string;
  password_confirmation: string;
}) => {
  return publicFetch(`${process.env.NEXT_PUBLIC_API_URL}/reset-password`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};
