// ScenePrompter service worker — makes the app installable and usable offline.
// Bump CACHE when shipping so clients pick up new assets.
const CACHE = 'sceneprompter-v1';

// The app shell. Fonts and other assets are cached at runtime on first use,
// so the list stays short and self-maintaining.
const CORE = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/db.js',
    './js/subjects.js',
    './js/promptEngine.js',
    './js/app.js',
    './vendor/three.min.js',
    './vendor/OrbitControls.js',
    './vendor/fonts.css',
    './assets/logo.png',
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    e.respondWith(
        caches.match(req).then(hit => hit || fetch(req).then(res => {
            // Runtime-cache same-origin GETs (fonts, images loaded after boot).
            if (res.ok && new URL(req.url).origin === location.origin) {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(req, copy));
            }
            return res;
        }).catch(() => caches.match('./index.html')))
    );
});
