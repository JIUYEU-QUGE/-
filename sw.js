// 课堂反馈生成器 Service Worker
const CACHE_NAME = 'class-feedback-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 安装：缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截：网络优先，失败回退缓存
self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // 只缓存 GET 请求
  if (req.method !== 'GET') return;
  
  // API 请求不缓存
  if (req.url.includes('/v1/chat/completions')) return;
  
  event.respondWith(
    fetch(req)
      .then((response) => {
        // 缓存成功的响应
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，从缓存取
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          // 导航请求回退到首页
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
