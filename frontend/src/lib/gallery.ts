export const galleryCategories = ["services", "interior", "tools"] as const;

export type GalleryCategory = (typeof galleryCategories)[number];

export const galleryCategoryLabels: Record<GalleryCategory, string> = {
  services: "Services",
  interior: "Interior",
  tools: "Tools",
};
