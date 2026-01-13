require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const DatabaseConnection = require("./config/database");
const RedisConnection = require("./config/redis");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// API routes with versioning
app.use("/api", routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    return res
      .status(400)
      .json({ error: "Validation error", details: err.message });
  }

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File size exceeds the maximum allowed size" });
    }
    return res
      .status(400)
      .json({ error: "File upload error", details: err.message });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Initialize database and Redis connections
async function startServer() {
  try {
    // Connect to database
    const dbConnection = DatabaseConnection.getInstance();
    await dbConnection.connect();

    // Note: Database schema is managed via migrations
    require("./models");
    console.log("Database models loaded");

    // Connect to Redis
    const redisConnection = RedisConnection.getInstance();
    await redisConnection.connect();

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  try {
    await DatabaseConnection.getInstance().disconnect();
    await RedisConnection.getInstance().disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server");
  try {
    await DatabaseConnection.getInstance().disconnect();
    await RedisConnection.getInstance().disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

startServer();

module.exports = app;
