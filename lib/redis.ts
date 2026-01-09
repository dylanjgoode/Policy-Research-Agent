import { Redis } from '@upstash/redis';

// Create Redis client - will gracefully handle missing credentials
function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[Redis] Missing UPSTASH credentials - caching disabled');
    return null;
  }

  return new Redis({ url, token });
}

const redisClient = createRedisClient();

// Wrapper that handles missing Redis gracefully
export const redis = {
  async get<T>(key: string): Promise<T | null> {
    if (!redisClient) return null;
    try {
      return await redisClient.get<T>(key);
    } catch (error) {
      console.warn('[Redis] Get error:', error);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    if (!redisClient) return;
    try {
      await redisClient.set(key, value);
    } catch (error) {
      console.warn('[Redis] Set error:', error);
    }
  },

  async setex<T>(key: string, seconds: number, value: T): Promise<void> {
    if (!redisClient) return;
    try {
      await redisClient.setex(key, seconds, value);
    } catch (error) {
      console.warn('[Redis] Setex error:', error);
    }
  },

  async del(key: string): Promise<void> {
    if (!redisClient) return;
    try {
      await redisClient.del(key);
    } catch (error) {
      console.warn('[Redis] Del error:', error);
    }
  },

  async exists(key: string): Promise<boolean> {
    if (!redisClient) return false;
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.warn('[Redis] Exists error:', error);
      return false;
    }
  },
};
