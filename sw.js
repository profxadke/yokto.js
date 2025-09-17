/**
 * Service Worker for yokto.js PWA
 */
const CACHE_NAME = 'yokto-local-cache';
const OFFLINE_RESOURCES = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/main.js',
    'https://cdn.jsdelivr.net/gh/profxadke/yokto.js@main/yokto.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(OFFLINE_RESOURCES);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (!response || response.status !== 200) return response;
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, clone);
                });
                return response;
            }).catch(() => {
                return caches.match('/index.html');
            });
        })
    );
});
