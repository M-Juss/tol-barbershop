export const getImageUrl = (image: string | null | undefined): string => {
  if (!image) return "";
  try {
    const url = new URL(image, "http://localhost");
    return url.pathname;
  } catch {
    return image.startsWith("/") ? image : `/${image}`;
  }
};
