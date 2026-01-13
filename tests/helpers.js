const jwt = require("jsonwebtoken");

/**
 * Generate a test JWT token
 */
const generateTestToken = (userId = 1) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });
};

/**
 * Generate a test refresh token
 */
const generateTestRefreshToken = (userId = 1) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
};

/**
 * Create a mock user object
 */
const createMockUser = (overrides = {}) => {
  return {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    password: "$2a$10$hashedpassword",
    comparePassword: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
};

/**
 * Create a mock note object
 */
const createMockNote = (overrides = {}) => {
  return {
    id: 1,
    userId: 1,
    title: "Test Note",
    content: "Test content",
    version: 1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

module.exports = {
  generateTestToken,
  generateTestRefreshToken,
  createMockUser,
  createMockNote,
};
