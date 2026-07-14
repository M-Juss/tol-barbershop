import { authFetch } from "@/lib/api";

import type { GalleryCategory } from "@/lib/gallery";
import type { GalleryImageFormValues } from "@/validations/gallery-image.validation";

export type GalleryImage = {
  id: number;
  category: GalleryCategory;
  image_url: string;
  alt_text: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

const API = process.env.NEXT_PUBLIC_API_URL;

const toFormData = (data: GalleryImageFormValues): FormData => {
  const formData = new FormData();

  if (data.image) {
    formData.append("image", data.image);
  }

  formData.append("category", data.category);
  formData.append("alt_text", data.alt_text);
  formData.append("display_order", String(data.display_order));

  return formData;
};

export const getGalleryImages = async (): Promise<GalleryImage[]> => {
  const response = await authFetch(`${API}/gallery-images`);
  return response.data?.gallery_images ?? [];
};

export const createGalleryImage = async (
  data: GalleryImageFormValues,
): Promise<GalleryImage> => {
  const response = await authFetch(`${API}/gallery-images`, {
    method: "POST",
    body: toFormData(data),
  });

  return response.data.gallery_image;
};

export const updateGalleryImage = async (
  id: number,
  data: GalleryImageFormValues,
): Promise<GalleryImage> => {
  const formData = toFormData(data);
  formData.append("_method", "PUT");

  const response = await authFetch(`${API}/gallery-images/${id}`, {
    method: "POST",
    body: formData,
  });

  return response.data.gallery_image;
};

export const deleteGalleryImage = async (id: number): Promise<void> => {
  await authFetch(`${API}/gallery-images/${id}`, {
    method: "DELETE",
  });
};
