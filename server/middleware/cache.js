const { getOrSet, invalidatePattern } = require('../config/redis');

const cacheMiddleware = (keyPrefix, ttlSeconds = 3600) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    const userId = req.user?.id || 'anon';
    const queryKey = JSON.stringify(req.query || {});
    const cacheKey = `${keyPrefix}:${userId}:${queryKey}`;

    try {
      const data = await getOrSet(
        cacheKey,
        () => new Promise((resolve) => {
          const originalJson = res.json.bind(res);
          res.json = (body) => {
            resolve(body);
            originalJson(body);
          };
          next();
        }),
        ttlSeconds
      );

      if (res.headersSent) return;

      res.json(data);
    } catch (err) {
      next();
    }
  };
};

const invalidateCache = (...prefixes) => {
  return async (_req, _res, next) => {
    try {
      await Promise.all(prefixes.map((p) => invalidatePattern(`${p}:*`)));
    } catch {
      // Non-critical
    }
    next();
  };
};

module.exports = { cacheMiddleware, invalidateCache };
