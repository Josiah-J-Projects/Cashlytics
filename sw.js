const CACHE = 'cashlytics_v0.8.0'
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim())
})