import { authFetch } from "@/lib/api";

export type EntityChangeVersions = {
  appointments: string;
};

export async function getEntityChangeVersions(
  signal?: AbortSignal,
): Promise<EntityChangeVersions> {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/changes`,
    { signal },
  );

  return response.data;
}
