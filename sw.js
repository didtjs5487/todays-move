/* 오늘의 무브 — 오프라인에서도 열리게 하는 서비스 워커.
   버전을 올리면 옛 캐시를 지우고 새로 담는다. */
const V = "todays-move-v6";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg",
  "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  // 하나라도 못 받으면 설치가 통째로 실패하므로 낱개로 담는다
  e.waitUntil(caches.open(V).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // 화면 자체는 새 버전을 먼저 받아 보고, 연결이 없으면 담아 둔 것을 쓴다
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(V);
        c.put("./", res.clone());
        return res;
      } catch (err) {
        return (await caches.match("./")) || (await caches.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  // 아이콘·글꼴 등은 담아 둔 것을 먼저 쓰고, 없으면 받아서 담는다
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === "opaque")) {
        const c = await caches.open(V);
        c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      return Response.error();
    }
  })());
});
