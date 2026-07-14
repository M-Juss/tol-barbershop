import { publicFetch, authFetch } from "@/lib/api";

export type AuthUser = {
  id: number;
  fullname: string;
  email: string;
  contact_number: string;
  role: string;
  image?: string | null;
  created_at?: string;
  permissions?: string[] | null;
};

export type LoginResponse = {
  success: boolean;
  message?: string;
  data: {
    user: AuthUser;
  };
};

export type RegisterResponse = {
  success: boolean;
  message?: string;
  data: AuthUser;
};

export type AuthActionResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
};

type ChangeRegistrationEmailResponse = {
  success: boolean;
  message?: string;
  data: {
    email: string;
  };
};

type ValidateResetPasswordTokenResponse = {
  success: boolean;
  message?: string;
  data: {
    valid: boolean;
  };
};

type CurrentUserResponse = {
  success: boolean;
  message?: string;
  data: AuthUser;
};

export const registerCustomerRequest = async (data: {
  fullname: string;
  contact_number: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<RegisterResponse> => {
  return publicFetch(`${process.env.NEXT_PUBLIC_API_URL}/register`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const loginRequest = async (data: {
  email: string;
  password: string;
}): Promise<LoginResponse> => {
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

export const getCurrentUserRequest = async (): Promise<CurrentUserResponse> => {
  return authFetch(`${process.env.NEXT_PUBLIC_API_URL}/user`);
};

export const forgotPasswordRequest = async (data: {
  email: string;
}): Promise<AuthActionResponse> => {
  return publicFetch(`${process.env.NEXT_PUBLIC_API_URL}/forgot-password`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const resendEmailVerificationRequest = async (data: {
  email: string;
}): Promise<AuthActionResponse> => {
  return publicFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/email/verification-notification`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
};

export const changeRegistrationEmailRequest = async (data: {
  current_email: string;
  password: string;
  new_email: string;
  new_email_confirmation: string;
}): Promise<ChangeRegistrationEmailResponse> => {
  return publicFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/email/change-registration-email`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
};

export const validateResetPasswordTokenRequest = async (
  data: {
    email: string;
    token: string;
  },
  signal?: AbortSignal,
): Promise<ValidateResetPasswordTokenResponse> => {
  return publicFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/reset-password/validate-token`,
    {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    },
  );
};

export const resetPasswordRequest = async (data: {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}): Promise<AuthActionResponse> => {
  return publicFetch(`${process.env.NEXT_PUBLIC_API_URL}/reset-password`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};
