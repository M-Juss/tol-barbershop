
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

  return res;
}
