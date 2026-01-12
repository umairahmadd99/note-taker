const { User } = require("../models");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");
const RedisConnection = require("../config/redis");
const { Op } = require("sequelize");

class AuthController {
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { username }],
        },
      });

      if (existingUser) {
        return res
          .status(400)
          .json({ error: "User already exists with this email or username" });
      }

      // Create user
      const user = await User.create({
        username,
        email,
        password,
      });

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token in Redis
      const redisClient = RedisConnection.getInstance().getClient();
      if (redisClient.isOpen) {
        await redisClient.setEx(
          `refresh_token:${user.id}`,
          7 * 24 * 60 * 60, // 7 days
          refreshToken
        );
      }

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res
        .status(500)
        .json({ error: "Registration failed", details: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token in Redis
      const redisClient = RedisConnection.getInstance().getClient();
      if (redisClient.isOpen) {
        await redisClient.setEx(
          `refresh_token:${user.id}`,
          7 * 24 * 60 * 60, // 7 days
          refreshToken
        );
      }

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed", details: error.message });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token required" });
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Check if refresh token exists in Redis
      const redisClient = RedisConnection.getInstance().getClient();
      if (redisClient.isOpen) {
        const storedToken = await redisClient.get(
          `refresh_token:${decoded.userId}`
        );

        if (storedToken !== refreshToken) {
          return res.status(401).json({ error: "Invalid refresh token" });
        }
      }

      // Generate new access token
      const accessToken = generateAccessToken(decoded.userId);

      res.json({
        accessToken,
      });
    } catch (error) {
      if (
        error.name === "TokenExpiredError" ||
        error.name === "JsonWebTokenError"
      ) {
        return res
          .status(401)
          .json({ error: "Invalid or expired refresh token" });
      }
      res
        .status(500)
        .json({ error: "Token refresh failed", details: error.message });
    }
  }
}

module.exports = new AuthController();
