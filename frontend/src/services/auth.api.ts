
export  const registerCustomerRequest = async (data: {
  fullname: string;
  contact_number: string;
  email: string;
  password: string;
  password_confirmation: string;
}) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create customer');
  }

  return response.json();
}

export const loginRequest = async (data: {
  email: string;
  password: string;
}) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const res = await response.json();

  if (!response.ok) {
    throw new Error('Failed to login');
  }
  
  localStorage.setItem('auth_token', `Bearer ${res.data.token}`);
  localStorage.setItem('auth_user', JSON.stringify(res.data.user));
  document.cookie = `auth_role=${res.data.user.role}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;

  return res;
}

export const forgotPasswordRequest = async (data: { email: string }) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const res = await response.json();

  if (!response.ok) {
    throw new Error(res.message || "Failed to request password reset");
  }

  return res;
};

export const resetPasswordRequest = async (data: {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const res = await response.json();

  if (!response.ok) {
    throw new Error(res.message || "Failed to reset password");
  }

  return res;
};
