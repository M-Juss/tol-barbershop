import type { GalleryCategory } from "@/lib/gallery";
import { publicFetch } from "@/lib/api";

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

  const result = await publicFetch(`${apiUrl}/public-services`, {
    cache: "no-store",
  });
  return result.data?.services ?? result.services ?? [];
};

export const getLandingGalleryImages = async (): Promise<
  LandingGalleryImage[]
> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const result = await publicFetch(`${apiUrl}/public-gallery-images`, {
    cache: "no-store",
  });
  return result.data?.gallery_images ?? result.gallery_images ?? [];
};

export const getLandingFeedback = async (): Promise<LandingFeedback[]> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const result = await publicFetch(`${apiUrl}/public-feedback`, {
    cache: "no-store",
  });
  return result.data?.feedback ?? result.feedback ?? [];
};

export const getFeaturedFeedback = async (): Promise<LandingFeedback[]> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const result = await publicFetch(`${apiUrl}/featured-feedback`, {
    cache: "no-store",
  });
  return result.data?.feedback ?? result.feedback ?? [];
};
