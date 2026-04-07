const CACHE_NAME = 'clamason-spares-v6';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/api.js',
    '/js/ui.js',
    '/js/components.js',
    '/js/utils.js',
    '/js/scanner.js',
    '/img/logo.png'
];

// Install — cache all assets
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate — remove old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', e => {
    // Skip SSE and API calls — always go to network
    if (e.request.url.includes('/events') || e.request.url.includes('/items') || e.request.url.includes('/workstations')) {
        return;
    }
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
