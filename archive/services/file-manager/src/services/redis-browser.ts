import Redis from 'ioredis';

// Create Redis client
function createRedisClient(): Redis {
  return new Redis({
    host: process.env.REDIS_HOST || 'deepkit-cache',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    }
  });
}

export interface RedisKeyInfo {
  key: string;
  type: string;
  ttl: number; // -1 = no expiry, -2 = does not exist
  size: number; // memory usage in bytes
}

export interface RedisValue {
  key: string;
  type: string;
  ttl: number;
  value: any; // Depends on type
  size: number;
}

export interface RedisScanResult {
  keys: RedisKeyInfo[];
  cursor: number;
  total: number;
}

/**
 * Scan Redis keys with cursor-based pagination
 */
export async function scanKeys(
  pattern: string = '*',
  cursor: number = 0,
  count: number = 100
): Promise<RedisScanResult> {
  const redis = createRedisClient();
  try {
    // Limit count to prevent memory issues
    const limitedCount = Math.min(count, 1000);

    // Scan keys
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', limitedCount);

    // Get type and TTL for each key
    const keyInfos: RedisKeyInfo[] = [];
    for (const key of keys) {
      try {
        const [type, ttl, memory] = await Promise.all([
          redis.type(key),
          redis.ttl(key),
          redis.memory('USAGE', key).catch(() => 0)
        ]);

        keyInfos.push({
          key,
          type,
          ttl,
          size: memory as number
        });
      } catch (error) {
        console.error(`Error getting info for key ${key}:`, error);
      }
    }

    // Get total number of keys
    const dbsize = await redis.dbsize();

    return {
      keys: keyInfos,
      cursor: parseInt(newCursor, 10),
      total: dbsize
    };
  } finally {
    await redis.quit();
  }
}

/**
 * Get value of a specific key
 */
export async function getKeyValue(key: string): Promise<RedisValue | null> {
  const redis = createRedisClient();
  try {
    // Check if key exists
    const exists = await redis.exists(key);
    if (!exists) {
      return null;
    }

    // Get type, TTL, and memory
    const [type, ttl, memory] = await Promise.all([
      redis.type(key),
      redis.ttl(key),
      redis.memory('USAGE', key).catch(() => 0)
    ]);

    let value: any;

    // Get value based on type
    switch (type) {
      case 'string':
        value = await redis.get(key);
        break;

      case 'list':
        value = await redis.lrange(key, 0, -1);
        break;

      case 'set':
        value = await redis.smembers(key);
        break;

      case 'zset':
        const zsetData = await redis.zrange(key, 0, -1, 'WITHSCORES');
        // Convert to array of {value, score} objects
        value = [];
        for (let i = 0; i < zsetData.length; i += 2) {
          value.push({
            value: zsetData[i],
            score: parseFloat(zsetData[i + 1])
          });
        }
        break;

      case 'hash':
        value = await redis.hgetall(key);
        break;

      default:
        value = `[Unsupported type: ${type}]`;
    }

    return {
      key,
      type,
      ttl,
      value,
      size: memory as number
    };
  } finally {
    await redis.quit();
  }
}

/**
 * Delete a key
 */
export async function deleteKey(key: string): Promise<boolean> {
  const redis = createRedisClient();
  try {
    const result = await redis.del(key);
    return result === 1;
  } finally {
    await redis.quit();
  }
}

/**
 * Delete multiple keys
 */
export async function deleteKeys(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;

  const redis = createRedisClient();
  try {
    const result = await redis.del(...keys);
    return result;
  } finally {
    await redis.quit();
  }
}

/**
 * Get Redis server info
 */
export async function getRedisInfo(): Promise<{
  version: string;
  uptime: number;
  connectedClients: number;
  usedMemory: string;
  totalKeys: number;
}> {
  const redis = createRedisClient();
  try {
    const [info, dbsize] = await Promise.all([
      redis.info('server'),
      redis.dbsize()
    ]);

    // Parse info string
    const lines = info.split('\r\n');
    const parsed: any = {};
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          parsed[key] = value;
        }
      }
    }

    return {
      version: parsed.redis_version || 'unknown',
      uptime: parseInt(parsed.uptime_in_seconds || '0', 10),
      connectedClients: parseInt(parsed.connected_clients || '0', 10),
      usedMemory: formatBytes(parseInt(parsed.used_memory || '0', 10)),
      totalKeys: dbsize
    };
  } finally {
    await redis.quit();
  }
}

/**
 * Search keys by pattern
 */
export async function searchKeys(pattern: string, limit: number = 100): Promise<RedisKeyInfo[]> {
  const redis = createRedisClient();
  try {
    const keys: string[] = [];
    let cursor = '0';

    // Scan until we have enough keys or complete the scan
    do {
      const [newCursor, scannedKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      keys.push(...scannedKeys);
      cursor = newCursor;

      if (keys.length >= limit) break;
    } while (cursor !== '0');

    // Limit results
    const limitedKeys = keys.slice(0, limit);

    // Get info for each key
    const keyInfos: RedisKeyInfo[] = [];
    for (const key of limitedKeys) {
      try {
        const [type, ttl, memory] = await Promise.all([
          redis.type(key),
          redis.ttl(key),
          redis.memory('USAGE', key).catch(() => 0)
        ]);

        keyInfos.push({
          key,
          type,
          ttl,
          size: memory as number
        });
      } catch (error) {
        console.error(`Error getting info for key ${key}:`, error);
      }
    }

    return keyInfos;
  } finally {
    await redis.quit();
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
