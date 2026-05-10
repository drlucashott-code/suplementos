self.addEventListener("push", (event) => {
  let payload = {
    title: "amazonpicks",
    body: "Você tem uma nova notificação.",
    href: "/notificacoes",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "/notificacoes",
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    // keep default payload
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: {
        href: payload.href,
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const href = event.notification.data?.href ?? "/notificacoes";
  const targetUrl = new URL(href, self.location.origin).toString();

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        if ("focus" in client) {
          try {
            if (client.url === targetUrl || client.url.startsWith(self.location.origin)) {
              await client.focus();
              if ("navigate" in client) {
                await client.navigate(targetUrl);
              }
              return;
            }
          } catch {
            // ignore and fallback to openWindow
          }
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
