const CACHE = 'cashlytics_v0.8.0'

//install the app
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(['/']))
  )
  self.skipWaiting()
})

//delete caches of old versions
self.addEventListener('activate', e => {
  e.waitUntil(
     //get all stored cache names
    caches.keys().then(keys =>
      //delete any cache that does not match current version
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

//Check cache when app requests a file, otherwise fetch from network
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  //only cache files from origin
  if (!e.request.url.startsWith(self.location.origin)) return

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      //check if this file is already cached
      const cached = await cache.match(e.request)
      // otherwise download newest version from internet
      const networkPromise = fetch(e.request)
        .then(response => {
           //only cache successful responses
          if (response.ok) cache.put(e.request, response.clone())
          return response
        })
        .catch(() => null)
      return cached || await networkPromise
    })
  )
})