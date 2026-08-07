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
  data: {
    email: string;
  };
};

export type RegisterPayload = {
  fullname: string;
  contact_number: string;
  email: string;
  password: string;
  password_confirmation: string;
  terms_accepted: boolean;
  privacy_acknowledged: boolean;
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

type VerifyEmailResponse = {
  success: boolean;
  message?: string;
  data: {
    status: "verified" | "already_verified";
  };
};

type CurrentUserResponse = {
  success: boolean;
  message?: string;
  data: AuthUser;
};

export const registerCustomerRequest = async (
  data: RegisterPayload,
): Promise<RegisterResponse> => {
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

export const logoutRequest = async (pushEndpoint?: string) => {
  return authFetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
    method: "POST",
    body: pushEndpoint
      ? JSON.stringify({ push_endpoint: pushEndpoint })
      : undefined,
  });
};

export const getCurrentUserRequest = async (): Promise<CurrentUserResponse> => {
  return publicFetch(`${process.env.NEXT_PUBLIC_API_URL}/user`);
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

export const confirmEmailVerificationRequest = async (
  signedPath: string,
): Promise<VerifyEmailResponse> => {
  const parsed = new URL(signedPath, "https://same-origin.invalid");

  if (
    parsed.origin !== "https://same-origin.invalid" ||
    !/^\/api\/v1\/email\/verify\/\d+\/[a-f0-9]{40}$/i.test(parsed.pathname) ||
    parsed.hash
  ) {
    throw new Error("Invalid email verification link.");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return publicFetch(
    `${apiUrl}${parsed.pathname.slice("/api/v1".length)}${parsed.search}`,
    {
      method: "POST",
    },
  );
};

type CheckVerificationStatusResponse = {
  success: boolean;
  message?: string;
  data: {
    verified: boolean;
  };
};

export const checkEmailVerificationStatus = async (
  email: string,
): Promise<CheckVerificationStatusResponse> => {
  const params = new URLSearchParams({ email });
  return publicFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/email/verify/status?${params.toString()}`,
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
      cache: "no-store",
      referrerPolicy: "no-referrer",
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
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
};
