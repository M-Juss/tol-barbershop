(() => {
  const { pathname, search, hash } = window.location;
  if (pathname !== "/reset-password" || !search) {
    return;
  }

  const params = new URLSearchParams(search);
  if (!params.has("token") && !params.has("email")) return;

  const preservedParams = new URLSearchParams();
  if (params.has("status")) preservedParams.set("status", params.get("status"));
  const preservedSearch = preservedParams.toString();

  window.history.replaceState(
    window.history.state,
    "",
    `${pathname}${preservedSearch ? `?${preservedSearch}` : ""}${hash}`,
  );
})();
