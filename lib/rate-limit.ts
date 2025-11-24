import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

// Create rate limiter instance
// 10 requests per 10 minutes per IP
export const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  analytics: true,
  prefix: "@etra/ratelimit",
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

  return {
    success,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
    }
  };
}
