const RedisConnection = require("../config/redis");

/**
 * Cache middleware for frequently accessed endpoints
 */
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    try {
      const redisClient = RedisConnection.getInstance().getClient();

      if (!redisClient.isOpen) {
        await redisClient.connect();
      }

      const cacheKey = `cache:${req.originalUrl}:${
        req.user?.id || "anonymous"
      }`;
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Store original json function
      const originalJson = res.json.bind(res);

      // Override json to cache the response
      res.json = function (data) {
        redisClient.setEx(cacheKey, duration, JSON.stringify(data));
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      // If Redis fails, continue without caching
      next();
    }
  };
};

/**
 * Invalidate cache for a specific pattern
 */
const invalidateCache = async (pattern) => {
  try {
    const redisClient = RedisConnection.getInstance().getClient();

    if (!redisClient || !redisClient.isOpen) {
      try {
        await redisClient.connect();
      } catch (connectError) {
        console.warn(
          "Redis not available for cache invalidation:",
          connectError.message
        );
        return; // Continue without cache invalidation if Redis is unavailable
      }
    }

    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(
        `Cache invalidated: ${keys.length} key(s) matching pattern "${pattern}"`
      );
    }
  } catch (error) {
    console.error("Cache invalidation error:", error);
    // Don't throw - cache invalidation failure shouldn't break the app
  }
};

module.exports = { cacheMiddleware, invalidateCache };
