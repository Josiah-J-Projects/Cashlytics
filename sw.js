const CACHE = 'cashlytics_v0.8.0'

//install the app
self.addEventListener('install', e => {
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

//Check cache when app requests a file
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  e.respondWith(
    fetch(e.request)
      .then(response => {
        //cache successful responses as we go
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(e.request, clone))
        }
        return response
      })
      .catch(() => {
        //if network failed, try the cache (offline support)
        return caches.match(e.request)
      })
  )
})