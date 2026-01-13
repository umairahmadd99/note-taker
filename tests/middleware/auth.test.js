const { authenticate } = require("../../src/middleware/auth");
const { User } = require("../../src/models");
const jwt = require("jsonwebtoken");
const { createMockUser } = require("../helpers");

// Mock dependencies
jest.mock("../../src/models");
jest.mock("jsonwebtoken");

describe("Auth Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  it("should authenticate user with valid token", async () => {
    const token = "test-token-123";
    req.headers.authorization = `Bearer ${token}`;

    const decoded = { userId: 1 };
    jwt.verify.mockReturnValue(decoded);

    const mockUser = createMockUser();
    User.findByPk.mockResolvedValue(mockUser);

    await authenticate(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(token, "test-jwt-secret-key");
    expect(User.findByPk).toHaveBeenCalledWith(1);
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it("should return 401 if token is missing", async () => {
    req.headers.authorization = undefined;

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token format is invalid", async () => {
    req.headers.authorization = "InvalidToken";

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token is expired", async () => {
    const token = "expired-token";
    req.headers.authorization = `Bearer ${token}`;

    const error = new Error("Token expired");
    error.name = "TokenExpiredError";
    jwt.verify.mockImplementation(() => {
      throw error;
    });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Token expired",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token is invalid", async () => {
    const token = "invalid-token";
    req.headers.authorization = `Bearer ${token}`;

    jwt.verify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if user not found", async () => {
    const token = "test-token-999";
    req.headers.authorization = `Bearer ${token}`;

    const decoded = { userId: 999 };
    jwt.verify.mockReturnValue(decoded);
    User.findByPk.mockResolvedValue(null);

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "User not found",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
