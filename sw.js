// ScenePrompter service worker — makes the app installable and usable offline.
// Bump CACHE when shipping so clients pick up new assets.
const CACHE = 'sceneprompter-v2';

// The app shell. Fonts and other assets are cached at runtime on first use,
// so the list stays short and self-maintaining.
const CORE = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/db.js',
    './js/subjects.js',
    './js/materials.js',
    './js/colorpalette.js',
    './js/contentModules.js',
    './js/productshot.js',
    './js/sounddesign.js',
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
        }).catch(() => {
            // Only a full-page navigation should fall back to the app shell.
            // A failed script/asset request (e.g. offline before it was ever
            // cached) must fail as itself — falling back to index.html here
            // would hand a <script> tag an HTML document to parse as JS,
            // breaking the whole app instead of just that one request.
            if (req.mode === 'navigate') return caches.match('./index.html');
            return Response.error();
        }))
    );
});
