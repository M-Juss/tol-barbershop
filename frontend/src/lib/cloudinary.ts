const CLOUDINARY_HOST = "https://res.cloudinary.com/";
const UPLOAD_MARKER = "/image/upload/";

export function isCloudinaryImageUrl(url: string): boolean {
  return url.startsWith(CLOUDINARY_HOST);
}

export function getCloudinaryImageUrl(url: string, width: number): string {
  if (!isCloudinaryImageUrl(url) || !url.includes(UPLOAD_MARKER)) {
    return url;
  }

  return url.replace(
    UPLOAD_MARKER,
    `${UPLOAD_MARKER}f_auto,q_auto,c_limit,w_${width}/`,
  );
}
