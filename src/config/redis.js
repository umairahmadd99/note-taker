const redis = require("redis");
require("dotenv").config();

/**
 * Singleton pattern for Redis connection
 * Ensures only one instance of Redis client exists
 */
class RedisConnection {
  static instance = null;
  static client = null;

  static getInstance() {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  constructor() {
    if (RedisConnection.client) {
      return;
    }

    RedisConnection.client = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
      },
    });

    RedisConnection.client.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    RedisConnection.client.on("connect", () => {
      console.log("Redis Client Connected");
    });
  }

  async connect() {
    try {
      if (!RedisConnection.client.isOpen) {
        await RedisConnection.client.connect();
        console.log("Redis connection established successfully.");
      }
      return RedisConnection.client;
    } catch (error) {
      console.error("Unable to connect to Redis:", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (RedisConnection.client.isOpen) {
        await RedisConnection.client.quit();
        console.log("Redis connection closed.");
      }
    } catch (error) {
      console.error("Error closing Redis connection:", error);
      throw error;
    }
  }

  getClient() {
    // Ensure client is initialized
    if (!RedisConnection.client) {
      // Initialize if not already done
      new RedisConnection();
    }
    return RedisConnection.client;
  }
}

module.exports = RedisConnection;
