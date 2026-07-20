self.addEventListener("install", () => {
  self.skipWaiting();
});

const DEFAULT_ICON = "/Tol-Logo-White-Bg.png";
const ALLOWED_ICON_PATHS = new Set([DEFAULT_ICON]);
const ALLOWED_NAVIGATION_BASES = ["/customer", "/admin", "/manager"];

function getAllowedIcon(value) {
  if (typeof value !== "string") return DEFAULT_ICON;

  try {
    const url = new URL(value, self.location.origin);
    if (
      url.origin === self.location.origin &&
      ALLOWED_ICON_PATHS.has(url.pathname) &&
      !url.search &&
      !url.hash
    ) {
      return url.pathname;
    }
  } catch {}

  return DEFAULT_ICON;
}

function getAllowedNavigationUrl(value) {
  if (typeof value !== "string") return `${self.location.origin}/`;

  try {
    const url = new URL(value, self.location.origin);
    const allowedPath =
      url.pathname === "/" ||
      ALLOWED_NAVIGATION_BASES.some(
        (base) => url.pathname === base || url.pathname.startsWith(`${base}/`),
      );

    if (url.origin === self.location.origin && allowedPath) {
      return `${url.origin}${url.pathname}`;
    }
  } catch {}

  return `${self.location.origin}/`;
}

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    data = {};
  }

  const rawNotificationData =
    data?.data && typeof data.data === "object" ? data.data : {};
  const title =
    typeof data?.title === "string" ? data.title : "TOL Barbershop";
  const options = {
    body: typeof data?.body === "string" ? data.body : "",
    icon: getAllowedIcon(data?.icon),
    badge: getAllowedIcon(data?.badge),
    data: {
      url: getAllowedNavigationUrl(rawNotificationData.url),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = getAllowedNavigationUrl(event.notification.data?.url);

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const matchingClient = windowClients.find(
          (client) => client.url === urlToOpen,
        );
        if (matchingClient) {
          return matchingClient.focus();
        }
        return clients.openWindow(urlToOpen);
      }),
  );
});
