const request = require("supertest");
const express = require("express");
const authRoutes = require("../../src/routes/authRoutes");
const authController = require("../../src/controllers/authController");

// Mock the controller
jest.mock("../../src/controllers/authController");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

describe("Auth Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const mockResponse = {
        message: "User registered successfully",
        user: {
          id: 1,
          username: "testuser",
          email: "test@example.com",
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };

      authController.register.mockImplementation((req, res) => {
        res.status(201).json(mockResponse);
      });

      const response = await request(app).post("/api/auth/register").send({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockResponse);
      expect(authController.register).toHaveBeenCalled();
    });

    it("should return 400 for invalid input", async () => {
      const response = await request(app).post("/api/auth/register").send({
        username: "ab", // Too short
        email: "invalid-email",
        password: "123", // Too short
      });

      // Validation middleware should catch this
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login user successfully", async () => {
      const mockResponse = {
        message: "Login successful",
        user: {
          id: 1,
          username: "testuser",
          email: "test@example.com",
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };

      authController.login.mockImplementation((req, res) => {
        res.json(mockResponse);
      });

      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(authController.login).toHaveBeenCalled();
    });

    it("should return 400 for invalid input", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "invalid-email",
        password: "",
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /api/auth/refresh-token", () => {
    it("should refresh access token successfully", async () => {
      const mockResponse = {
        accessToken: "new-access-token",
      };

      authController.refreshToken.mockImplementation((req, res) => {
        res.json(mockResponse);
      });

      const response = await request(app).post("/api/auth/refresh-token").send({
        refreshToken: "valid-refresh-token",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(authController.refreshToken).toHaveBeenCalled();
    });

    it("should return 400 if refresh token is missing", async () => {
      authController.refreshToken.mockImplementation((req, res) => {
        res.status(400).json({ error: "Refresh token required" });
      });

      const response = await request(app)
        .post("/api/auth/refresh-token")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });
});
