const CACHE_NAME = 'productivity-tracker-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // Note: Bootstrap 5.3 CDN assets are not cached here as they are external.
  // We assume network access for the first load.
];

// 1. Installation: Cache static assets
self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache).catch(err => {
          console.error('Failed to cache resources:', err);
        });
      })
  );
});

// 2. Activation: Clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim control of clients immediately
  event.waitUntil(self.clients.claim());
});

// 3. Fetch: Serve from cache or network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and navigate/document requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can only be consumed once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a stream and can only be consumed once
            const responseToCache = response.clone();

            // Cache the new resource if it was a successful request
            if (urlsToCache.includes(event.request.url.replace(self.location.origin, '.')) || event.request.url.endsWith('index.html')) {
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
            }

            return response;
          }
        );
      })
  );
});

// 4. Message: Handle timer notifications from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TIMER_END') {
    const { timerType } = event.data;
    const title = `${timerType.toUpperCase()} Timer Finished!`;
    const options = {
      body: timerType === 'work' ? 'Time for a break!' : 'Time to get back to work!',
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: true, // Keep the notification visible until the user interacts with it
      tag: 'timer-notification'
    };
    self.registration.showNotification(title, options);
  }
});

// 5. Notification Click: Focus the client when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});