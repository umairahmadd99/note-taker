const {
  cacheMiddleware,
  invalidateCache,
} = require("../../src/middleware/cache");
const RedisConnection = require("../../src/config/redis");

// Mock dependencies
jest.mock("../../src/config/redis");

describe("Cache Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: "GET",
      originalUrl: "/api/v1/notes",
      user: { id: 1 },
    };
    res = {
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe("cacheMiddleware", () => {
    it("should cache GET request response", async () => {
      const middleware = cacheMiddleware(300);
      const mockRedisClient = {
        isOpen: true,
        get: jest.fn().mockResolvedValue(null),
        setEx: jest.fn().mockResolvedValue(true),
      };

      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      // Override res.json to capture the response
      const originalJson = res.json.bind(res);
      res.json = function (data) {
        originalJson(data);
        return this;
      };

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockRedisClient.get).toHaveBeenCalledWith("cache:/api/v1/notes:1");
    });

    it("should return cached data if available", async () => {
      const middleware = cacheMiddleware(300);
      const cachedData = JSON.stringify({ notes: [{ id: 1 }] });
      const mockRedisClient = {
        isOpen: true,
        get: jest.fn().mockResolvedValue(cachedData),
      };

      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      await middleware(req, res, next);

      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ notes: [{ id: 1 }] });
      expect(next).not.toHaveBeenCalled();
    });

    it("should skip caching for non-GET requests", async () => {
      req.method = "POST";
      const middleware = cacheMiddleware(300);

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(RedisConnection.getInstance).not.toHaveBeenCalled();
    });

    it("should continue without caching if Redis is not available", async () => {
      const middleware = cacheMiddleware(300);
      const mockRedisClient = {
        isOpen: false,
        connect: jest.fn().mockRejectedValue(new Error("Connection failed")),
      };

      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should handle Redis errors gracefully", async () => {
      const middleware = cacheMiddleware(300);
      const mockRedisClient = {
        isOpen: true,
        get: jest.fn().mockRejectedValue(new Error("Redis error")),
      };

      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("invalidateCache", () => {
    it("should invalidate cache for a pattern", async () => {
      const mockRedisClient = {
        isOpen: true,
        keys: jest.fn().mockResolvedValue(["cache:key1", "cache:key2"]),
        del: jest.fn().mockResolvedValue(2),
      };

      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      await invalidateCache("cache:pattern*");

      expect(mockRedisClient.keys).toHaveBeenCalledWith("cache:pattern*");
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        "cache:key1",
        "cache:key2",
      ]);
    });

    it("should handle empty pattern results", async () => {
      const mockRedisClient = {
        isOpen: true,
        keys: jest.fn().mockResolvedValue([]),
        del: jest.fn(),
      };

      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      await invalidateCache("cache:pattern*");

      expect(mockRedisClient.keys).toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it("should handle Redis connection errors gracefully", async () => {
      const mockRedisClient = {
        isOpen: false,
        connect: jest.fn().mockRejectedValue(new Error("Connection failed")),
      };

      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      await invalidateCache("cache:pattern*");

      // Should not throw error
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it("should handle Redis errors gracefully", async () => {
      const mockRedisClient = {
        isOpen: true,
        keys: jest.fn().mockRejectedValue(new Error("Redis error")),
      };

      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      await invalidateCache("cache:pattern*");

      // Should not throw error
      expect(mockRedisClient.keys).toHaveBeenCalled();
    });
  });
});
