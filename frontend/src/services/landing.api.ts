export interface LandingService {
  id: number;
  name: string;
  description?: string | null;
  price?: number | string | null;
  duration?: number | null;
  is_active?: boolean;
}

export interface LandingFeedback {
  id: number;
  appointment_id: number;
  rating: number;
  comment: string | null;
  customer_name: string;
  customer_initials: string;
  service_name: string | null;
  submitted_at: string;
}

export const getLandingServices = async (): Promise<LandingService[]> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await fetch(`${apiUrl}/public-services`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch public services: ${response.status}`,
    );
  }

  const result = await response.json();
  return result.data?.services ?? result.services ?? [];
};

export const getLandingFeedback = async (): Promise<LandingFeedback[]> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await fetch(`${apiUrl}/public-feedback`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch feedback: ${response.status}`,
    );
  }

  const result = await response.json();
  return result.data?.feedback ?? result.feedback ?? [];
};
