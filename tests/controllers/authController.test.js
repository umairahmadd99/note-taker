const authController = require("../../src/controllers/authController");
const { User } = require("../../src/models");
const RedisConnection = require("../../src/config/redis");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../src/utils/jwt");
const { generateTestToken, createMockUser } = require("../helpers");

// Mock dependencies
jest.mock("../../src/models");
jest.mock("../../src/config/redis");
jest.mock("../../src/utils/jwt");

describe("AuthController", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      req.body = {
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
      };

      const mockUser = createMockUser({
        id: 1,
        username: "newuser",
        email: "newuser@example.com",
      });

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      generateAccessToken.mockReturnValue("access-token");
      generateRefreshToken.mockReturnValue("refresh-token");

      const mockRedisClient = {
        isOpen: true,
        setEx: jest.fn().mockResolvedValue(true),
      };
      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      await authController.register(req, res);

      expect(User.findOne).toHaveBeenCalled();
      const callArgs = User.findOne.mock.calls[0][0];
      expect(callArgs.where).toBeDefined();
      expect(User.create).toHaveBeenCalledWith({
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "User registered successfully",
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });

    it("should return error if user already exists", async () => {
      req.body = {
        username: "existinguser",
        email: "existing@example.com",
        password: "password123",
      };

      const existingUser = createMockUser();
      User.findOne.mockResolvedValue(existingUser);

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "User already exists with this email or username",
      });
    });

    it("should handle registration errors", async () => {
      req.body = {
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
      };

      User.findOne.mockRejectedValue(new Error("Database error"));

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Registration failed",
        details: "Database error",
      });
    });
  });

  describe("login", () => {
    it("should login user successfully", async () => {
      req.body = {
        email: "test@example.com",
        password: "password123",
      };

      const mockUser = createMockUser({
        email: "test@example.com",
        comparePassword: jest.fn().mockResolvedValue(true),
      });

      User.findOne.mockResolvedValue(mockUser);
      generateAccessToken.mockReturnValue("access-token");
      generateRefreshToken.mockReturnValue("refresh-token");

      const mockRedisClient = {
        isOpen: true,
        setEx: jest.fn().mockResolvedValue(true),
      };
      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      await authController.login(req, res);

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(mockUser.comparePassword).toHaveBeenCalledWith("password123");
      expect(res.json).toHaveBeenCalledWith({
        message: "Login successful",
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });

    it("should return error for invalid credentials - user not found", async () => {
      req.body = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue(null);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid credentials",
      });
    });

    it("should return error for invalid credentials - wrong password", async () => {
      req.body = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const mockUser = createMockUser({
        comparePassword: jest.fn().mockResolvedValue(false),
      });

      User.findOne.mockResolvedValue(mockUser);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid credentials",
      });
    });

    it("should handle login errors", async () => {
      req.body = {
        email: "test@example.com",
        password: "password123",
      };

      User.findOne.mockRejectedValue(new Error("Database error"));

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Login failed",
        details: "Database error",
      });
    });
  });

  describe("refreshToken", () => {
    it("should refresh access token successfully", async () => {
      req.body = {
        refreshToken: "valid-refresh-token",
      };

      const decoded = { userId: 1 };
      const { verifyRefreshToken } = require("../../src/utils/jwt");
      verifyRefreshToken.mockReturnValue(decoded);
      generateAccessToken.mockReturnValue("new-access-token");

      const mockRedisClient = {
        isOpen: true,
        get: jest.fn().mockResolvedValue("valid-refresh-token"),
      };
      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      await authController.refreshToken(req, res);

      expect(verifyRefreshToken).toHaveBeenCalledWith("valid-refresh-token");
      expect(generateAccessToken).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "new-access-token",
      });
    });

    it("should return error if refresh token is missing", async () => {
      req.body = {};

      await authController.refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Refresh token required",
      });
    });

    it("should return error for invalid refresh token", async () => {
      req.body = {
        refreshToken: "invalid-refresh-token",
      };

      const { verifyRefreshToken } = require("../../src/utils/jwt");
      const error = new Error("Invalid token");
      error.name = "JsonWebTokenError";
      verifyRefreshToken.mockImplementation(() => {
        throw error;
      });

      const mockRedisClient = {
        isOpen: true,
        get: jest.fn().mockResolvedValue(null),
      };
      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      await authController.refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return error if stored token does not match", async () => {
      req.body = {
        refreshToken: "refresh-token",
      };

      const decoded = { userId: 1 };
      const { verifyRefreshToken } = require("../../src/utils/jwt");
      verifyRefreshToken.mockReturnValue(decoded);
      generateAccessToken.mockReturnValue("new-access-token");

      const mockRedisClient = {
        isOpen: true,
        get: jest.fn().mockResolvedValue("different-refresh-token"),
      };
      RedisConnection.getInstance.mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockRedisClient),
      });

      await authController.refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid refresh token",
      });
    });
  });
});
