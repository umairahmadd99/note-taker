const jwt = require("jsonwebtoken");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../../src/utils/jwt");

// Mock jsonwebtoken
jest.mock("jsonwebtoken");

describe("JWT Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateAccessToken", () => {
    it("should generate access token with correct payload and options", () => {
      const userId = 1;
      const expectedToken = "access-token";

      jwt.sign.mockReturnValue(expectedToken);

      const result = generateAccessToken(userId);

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || "1h",
        }
      );
      expect(result).toBe(expectedToken);
    });

    it("should use default expiration if JWT_EXPIRES_IN is not set", () => {
      const originalExpiresIn = process.env.JWT_EXPIRES_IN;
      delete process.env.JWT_EXPIRES_IN;

      const userId = 1;
      generateAccessToken(userId);

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );

      process.env.JWT_EXPIRES_IN = originalExpiresIn;
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate refresh token with correct payload and options", () => {
      const userId = 1;
      const expectedToken = "refresh-token";

      jwt.sign.mockReturnValue(expectedToken);

      const result = generateRefreshToken(userId);

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        {
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
        }
      );
      expect(result).toBe(expectedToken);
    });

    it("should use default expiration if JWT_REFRESH_EXPIRES_IN is not set", () => {
      const originalExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN;
      delete process.env.JWT_REFRESH_EXPIRES_IN;

      const userId = 1;
      generateRefreshToken(userId);

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        {
          expiresIn: "7d",
        }
      );

      process.env.JWT_REFRESH_EXPIRES_IN = originalExpiresIn;
    });
  });

  describe("verifyRefreshToken", () => {
    it("should verify refresh token successfully", () => {
      const token = "refresh-token";
      const decoded = { userId: 1 };

      jwt.verify.mockReturnValue(decoded);

      const result = verifyRefreshToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        process.env.JWT_REFRESH_SECRET
      );
      expect(result).toEqual(decoded);
    });

    it("should throw error for invalid token", () => {
      const token = "invalid-token";
      const error = new Error("Invalid token");
      error.name = "JsonWebTokenError";

      jwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => verifyRefreshToken(token)).toThrow("Invalid token");
      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        process.env.JWT_REFRESH_SECRET
      );
    });

    it("should throw error for expired token", () => {
      const token = "expired-token";
      const error = new Error("Token expired");
      error.name = "TokenExpiredError";

      jwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => verifyRefreshToken(token)).toThrow("Token expired");
    });
  });
});
