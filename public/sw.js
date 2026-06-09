const CACHE_NAME = 'maghagha-cache-v1';
const API_CACHE_NAME = 'maghagha-api-cache-v1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== API_CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Caching Supabase API calls (including schedules)
  const isSupabaseApi = url.host.includes('supabase.co') && url.pathname.includes('/rest/v1/');
  
  if (isSupabaseApi) {
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(API_CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request);
          })
      );
    }
    return;
  }

  // 2. Caching static assets or internal pages (Cache First with Stale-While-Revalidate)
  const isStaticAsset = 
    url.origin === self.location.origin || 
    url.host.includes('fonts.googleapis.com') || 
    url.host.includes('fonts.gstatic.com') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.includes('/assets/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch in background to update cache
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {/* Clean failure during background update */});
          
          return cachedResponse;
        }

        // Fetch from network and put into cache
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200 || networkResponse.type === 'opaque') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Fallback if network is completely offline for index page
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
      })
    );
  }
});
