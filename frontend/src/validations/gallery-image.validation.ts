import { z } from "zod";

import { galleryCategories } from "@/lib/gallery";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const imageSchema = z
  .custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    "Please select an image",
  )
  .refine(
    (file) => SUPPORTED_IMAGE_TYPES.includes(file.type),
    "Image must be a JPEG, PNG, or WebP file",
  )
  .refine(
    (file) => file.size <= MAX_IMAGE_SIZE,
    "Image must not exceed 5 MB",
  );

const galleryImageSchema = z.object({
  image: imageSchema.optional(),
  category: z.enum(galleryCategories, "Please select a category"),
  alt_text: z
    .string()
    .trim()
    .min(1, "Alternative text is required")
    .max(160, "Alternative text must not exceed 160 characters"),
  display_order: z
    .number()
    .int("Display order must be a whole number")
    .min(0, "Display order must be at least 0")
    .max(9999, "Display order must not exceed 9999"),
});

export const getGalleryImageSchema = (imageRequired: boolean) =>
  galleryImageSchema.superRefine((data, context) => {
    if (imageRequired && !data.image) {
      context.addIssue({
        code: "custom",
        path: ["image"],
        message: "Please select an image",
      });
    }
  });

export type GalleryImageFormValues = z.infer<typeof galleryImageSchema>;
