/**
 * Service Worker - 智能缓存策略
 * 版本: v2.0.0
 */

const CACHE_NAME = 'webstack-cache-v2';
const STATIC_CACHE = 'webstack-static-v2';
const DYNAMIC_CACHE = 'webstack-dynamic-v2';

// 缓存策略配置
const CACHE_STRATEGIES = {
  critical: 'cache-first',
  images: 'stale-while-revalidate',
  api: 'network-first',
  static: 'cache-first'
};

// 关键资源列表
const CRITICAL_RESOURCES = [
  '/',
  '/assets/css/bootstrap.min-4.3.1.css',
  '/assets/css/style-3.03029.1.min.css',
  '/assets/css/custom-style.min.css',
  '/assets/js/modern-app.js',
  '/assets/js/jquery.min-3.2.1.js'
];

// 静态资源列表
const STATIC_RESOURCES = [
  '/assets/fontawesome-5.15.4/css/all.min.css',
  '/assets/fontawesome-5.15.4/webfonts/fa-solid-900.woff2',
  '/assets/fontawesome-5.15.4/webfonts/fa-regular-400.woff2',
  '/assets/js/bootstrap.min-4.3.1.js',
  '/assets/js/popper.min.js'
];

// 安装事件 - 预缓存关键资源
self.addEventListener('install', event => {
  console.log('🚀 Service Worker 安装中...');
  
  event.waitUntil(
    Promise.all([
      // 缓存关键资源
      caches.open(STATIC_CACHE).then(cache => {
        console.log('📦 缓存关键资源...');
        return cache.addAll(CRITICAL_RESOURCES);
      }),
      
      // 缓存静态资源
      caches.open(DYNAMIC_CACHE).then(cache => {
        console.log('📦 缓存静态资源...');
        return cache.addAll(STATIC_RESOURCES);
      })
    ]).then(() => {
      console.log('✅ Service Worker 安装完成');
      return self.skipWaiting();
    })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker 激活中...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 删除旧版本的缓存
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE) {
            console.log('🗑️ 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker 激活完成');
      return self.clients.claim();
    })
  );
});

// 获取事件 - 智能缓存策略
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 跳过非GET请求
  if (request.method !== 'GET') {
    return;
  }
  
  // 跳过Chrome扩展等
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // 根据资源类型选择缓存策略
  if (isCriticalResource(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImage(request)) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  } else if (isAPI(request)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
  }
});

// 判断是否为关键资源
function isCriticalResource(request) {
  const url = new URL(request.url);
  return CRITICAL_RESOURCES.some(resource => 
    url.pathname === resource || 
    url.pathname.endsWith(resource)
  );
}

// 判断是否为图片
function isImage(request) {
  const url = new URL(request.url);
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(url.pathname) ||
         request.headers.get('accept')?.includes('image');
}

// 判断是否为API请求
function isAPI(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') ||
         url.pathname.includes('search') ||
         url.pathname.includes('weather');
}

// Cache First 策略
async function cacheFirst(request, cacheName) {
  try {
    // 先尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 缓存未命中，从网络获取
    const networkResponse = await fetch(request);
    
    // 缓存响应（如果是成功的响应）
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache First 策略失败:', error);
    throw error;
  }
}

// Network First 策略
async function networkFirst(request, cacheName) {
  try {
    // 先尝试从网络获取
    const networkResponse = await fetch(request);
    
    // 缓存成功的响应
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // 网络失败，尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Stale While Revalidate 策略
async function staleWhileRevalidate(request, cacheName) {
  try {
    // 立即返回缓存的响应（如果有）
    const cachedResponse = await caches.match(request);
    
    // 在后台更新缓存
    const updateCache = fetch(request).then(networkResponse => {
      if (networkResponse.ok) {
        return caches.open(cacheName).then(cache => {
          cache.put(request, networkResponse.clone());
        });
      }
    }).catch(error => {
      console.warn('后台缓存更新失败:', error);
    });
    
    // 如果有缓存响应，立即返回
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 没有缓存，等待网络响应
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Stale While Revalidate 策略失败:', error);
    throw error;
  }
}

// 消息处理
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '2.0.0' });
  }
});

// 错误处理
self.addEventListener('error', event => {
  console.error('Service Worker 错误:', event.error);
});

// 未处理的Promise拒绝
self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker 未处理的Promise拒绝:', event.reason);
});
