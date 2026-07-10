self.addEventListener("install", () => {
  self.skipWaiting();
});

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

  const title = data.title || "TOL Barbershop";
  const options = {
    body: data.body || "",
    icon: data.icon || "/Tol-Logo-White-Bg.png",
    badge: data.badge || "/Tol-Logo-White-Bg.png",
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

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
