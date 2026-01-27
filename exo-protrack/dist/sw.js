const CACHE_NAME = 'exo-protrack-v3';
const STATIC_CACHE = 'exo-static-v3';
const API_CACHE = 'exo-api-v3';

// Статические ресурсы для кэширования
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Активация и очистка старых кэшей
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API запросы - NetworkFirst с fallback
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Статические ресурсы - CacheFirst
  if (request.method === 'GET') {
    event.respondWith(cacheFirst(event, request, STATIC_CACHE));
    return;
  }

  // POST запросы - только сеть
  event.respondWith(networkOnly(request));
});

// Стратегия: Cache First
async function cacheFirst(event, request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    // Обновить кэш в фоне
    event.waitUntil(
      fetch(request).then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      }).catch(() => {})
    );
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Офлайн', { status: 503 });
  }
}

// Стратегия: Network First с кэшированием
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Кэшируем только успешные GET запросы
      if (request.method === 'GET') {
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch (error) {
    // При ошибке сети - вернуть из кэша
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response(
      JSON.stringify({ error: 'Офлайн', message: 'Нет подключения к интернету' }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Стратегия: Только сеть
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Офлайн', message: 'Требуется подключение к интернету' }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Push уведомления
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  
  const options = {
    body: data.message || 'Новое уведомление',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      notificationId: data.id
    },
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'dismiss', title: 'Закрыть' }
    ],
    tag: data.tag || 'default',
    requireInteraction: data.priority === 'urgent'
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'EXO ProTrack', options)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Если есть открытое окно - фокусируем его
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Иначе открываем новое
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Фоновая синхронизация
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  // Синхронизация отложенных данных
  const cache = await caches.open('pending-sync');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const cachedRequest = await cache.match(request);
      if (!cachedRequest) continue;
      
      await fetch(request);
      await cache.delete(request);
    } catch (error) {
      console.error('Sync failed for request:', request.url);
    }
  }
}

// Сообщения от клиента
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(names.map((name) => caches.delete(name)));
      })
    );
  }
});

export {};
