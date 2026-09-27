const Redis = require('ioredis');

let redisClient = null;

const connectRedis = () => {
  if (!process.env.REDIS_URL) {
    console.warn('⚠️   REDIS_URL not set — Redis disabled');
    return null;
  }

  const client = new Redis(process.env.REDIS_URL, {
    retryStrategy: () => null,
    maxRetriesPerRequest: 0,
    lazyConnect: true,
    enableReadyCheck: false,
    enableOfflineQueue: false,
  });

  client.on('connect', () => console.log('✅  Redis connected'));
  client.on('error', () => { });

  client.connect().catch(() => {
    console.warn('⚠️   Redis unavailable — continuing without cache');
    redisClient = null;
  });

  redisClient = client;
  return client;
};

const getRedisClient = () => redisClient;

const getOrSet = async (key, fetchFn, ttlSeconds = 3600) => {
  const client = getRedisClient();
  if (!client) return fetchFn();

  try {
    const cached = await client.get(key);
    if (cached) return JSON.parse(cached);
  } catch {
    return fetchFn();
  }

  const data = await fetchFn();

  try {
    await client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch {
    // Redis write failed — still return fresh data
  }

  return data;
};

const invalidatePattern = async (pattern) => {
  const client = getRedisClient();
  if (!client) return;

  const matchPattern = pattern.includes('*') ? pattern : `${pattern}:*`;

  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', matchPattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // Redis scan failed — non-critical
  }
};

module.exports = { connectRedis, getRedisClient, getOrSet, invalidatePattern };
