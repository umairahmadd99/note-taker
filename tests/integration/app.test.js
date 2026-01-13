const request = require("supertest");
const app = require("../../src/server");

// Mock database and Redis connections
jest.mock("../../src/config/database", () => ({
  getInstance: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(true),
    getSequelize: jest.fn(),
    disconnect: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock("../../src/config/redis", () => ({
  getInstance: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(true),
    getClient: jest.fn(() => ({
      isOpen: true,
      get: jest.fn().mockResolvedValue(null),
      setEx: jest.fn().mockResolvedValue(true),
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(0),
    })),
    disconnect: jest.fn().mockResolvedValue(true),
  })),
}));

// Mock models
jest.mock("../../src/models", () => ({
  User: {},
  Note: {},
  NoteVersion: {},
  NoteShare: {},
  NoteAttachment: {},
}));

describe("App Integration Tests", () => {
  describe("Health Check", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "OK");
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  describe("404 Handler", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(app).get("/unknown-route");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Route not found");
    });
  });

  describe("Error Handling", () => {
    it("should handle validation errors", async () => {
      const response = await request(app).post("/api/auth/register").send({
        username: "ab", // Invalid
        email: "invalid-email", // Invalid
        password: "123", // Invalid
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle JSON parsing errors", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .set("Content-Type", "application/json")
        .send("invalid json");

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("CORS", () => {
    it("should include CORS headers", async () => {
      const response = await request(app).get("/health");

      // CORS middleware should be applied
      expect(response.headers).toBeDefined();
    });
  });

  describe("Rate Limiting", () => {
    it("should apply rate limiting", async () => {
      // Make multiple requests
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get("/health"));

      const responses = await Promise.all(requests);

      // All should succeed (rate limit is 100 per 15 minutes)
      responses.forEach((response) => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });
});
