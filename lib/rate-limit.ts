import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

const isRateLimitEnabled = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

const ratelimit = isRateLimitEnabled ? new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  analytics: true,
  prefix: "@etra/ratelimit",
}) : null;

export async function checkRateLimit(identifier: string): Promise<{
  success: boolean;
  headers: Record<string, string>;
}> {
  if (!ratelimit) {
    return {
      success: true,
      headers: {},
    };
  }

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
