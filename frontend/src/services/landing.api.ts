export interface LandingService {
  id: number;
  name: string;
  description?: string | null;
  price?: number | string | null;
  duration?: number | null;
  is_active?: boolean;
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
