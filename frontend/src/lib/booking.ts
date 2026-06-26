export function formatBookingId(id: number | string | null | undefined): string {
  if (id == null) return "";
  const num = typeof id === "string" ? Number(id) : id;
  if (!Number.isFinite(num)) return "";
  const random5 = ((num * 12345 + 67890) % 90000) + 10000;
  return `BK-${random5}`;
}
