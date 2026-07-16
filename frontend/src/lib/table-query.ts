type SearchParamsLike = {
  toString: () => string;
};

type QueryValue = string | number | null | undefined;

export function buildTableUrl(
  pathname: string,
  current: SearchParamsLike,
  updates: Record<string, QueryValue>,
): string {
  const params = new URLSearchParams(current.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
      return;
    }

    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function getPaginationPages(
  currentPage: number,
  lastPage: number,
): Array<number | "ellipsis"> {
  const pages: Array<number | "ellipsis"> = [1];

  if (currentPage > 3) pages.push("ellipsis");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(lastPage - 1, currentPage + 1);
  for (let page = start; page <= end; page += 1) pages.push(page);

  if (currentPage < lastPage - 2) pages.push("ellipsis");
  if (lastPage > 1) pages.push(lastPage);

  return pages;
}
