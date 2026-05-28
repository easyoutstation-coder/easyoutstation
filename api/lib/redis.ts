import Redis from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;

  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: false,
  });

  client.on("connect", () => console.log("[Redis] Connected"));
  client.on("error", (err) => console.error("[Redis] Error:", err.message));
  client.on("close", () => console.warn("[Redis] Connection closed"));

  return client;
}

export function isRedisAvailable(): boolean {
  return !!process.env.REDIS_URL;
}
