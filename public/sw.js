// BTM Cleaning — Push Notification Service Worker
// Place this file at: public/sw.js

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

// ── Push received ──────────────────────────────────────────────────────────
self.addEventListener("push", event => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "BTM Cleaning", body: event.data.text(), url: "/driver/dashboard" };
  }

  const { title = "BTM Cleaning", body = "", icon = "/logo_btm.png", badge = "/badge-96.png", url = "/driver/dashboard", tag } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag: tag || "btm-driver",          // same tag replaces previous notification
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url },
    })
  );
});

// ── Notification click ─────────────────────────────────────────────────────
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/driver/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      // If app already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});