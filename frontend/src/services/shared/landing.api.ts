import type { GalleryCategory } from "@/lib/gallery";

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
  rating: number;
  comment: string | null;
  customer_name: string;
  customer_initials: string;
  service_name: string | null;
  submitted_at: string;
}

export type LandingGalleryImage = {
  id: number;
  category: GalleryCategory;
  image_url: string;
  alt_text: string;
  display_order: number;
};

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

export const getLandingGalleryImages = async (): Promise<
  LandingGalleryImage[]
> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await fetch(`${apiUrl}/public-gallery-images`, {
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
      errorData.message ||
        `Failed to fetch public gallery images: ${response.status}`,
    );
  }

  const result = await response.json();
  return result.data?.gallery_images ?? result.gallery_images ?? [];
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

export const getFeaturedFeedback = async (): Promise<LandingFeedback[]> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await fetch(`${apiUrl}/featured-feedback`, {
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
      errorData.message || `Failed to fetch featured feedback: ${response.status}`,
    );
  }

  const result = await response.json();
  return result.data?.feedback ?? result.feedback ?? [];
};
