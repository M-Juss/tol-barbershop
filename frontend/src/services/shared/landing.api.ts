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

type LandingBootstrap = {
  services: LandingService[];
  gallery_images: LandingGalleryImage[];
  featured_feedback: LandingFeedback[];
  feedback: LandingFeedback[];
};

const BOOTSTRAP_STALE_MS = 5 * 60_000;

let bootstrapRequest: Promise<LandingBootstrap> | null = null;
let bootstrapData: LandingBootstrap | null = null;
let bootstrapExpiresAt = 0;

async function getLandingBootstrap(): Promise<LandingBootstrap> {
  if (bootstrapData && Date.now() < bootstrapExpiresAt) {
    return bootstrapData;
  }

  if (bootstrapRequest) {
    return bootstrapRequest;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  bootstrapRequest = publicFetch(`${apiUrl}/public-bootstrap`, {
    cache: "force-cache",
  }).then((result) => (result.data ?? result) as LandingBootstrap);

  try {
    bootstrapData = await bootstrapRequest;
    bootstrapExpiresAt = Date.now() + BOOTSTRAP_STALE_MS;
    return bootstrapData;
  } finally {
    bootstrapRequest = null;
  }
}

export const getLandingServices = async (): Promise<LandingService[]> => {
  return (await getLandingBootstrap()).services ?? [];
};

export const getLandingGalleryImages = async (): Promise<
  LandingGalleryImage[]
> => {
  return (await getLandingBootstrap()).gallery_images ?? [];
};

export const getLandingFeedback = async (): Promise<LandingFeedback[]> => {
  return (await getLandingBootstrap()).feedback ?? [];
};

export const getFeaturedFeedback = async (): Promise<LandingFeedback[]> => {
  return (await getLandingBootstrap()).featured_feedback ?? [];
};
