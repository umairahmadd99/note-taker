const { Sequelize } = require("sequelize");
require("dotenv").config();

/**
 * Singleton pattern for database connection
 * Ensures only one instance of Sequelize connection exists
 */
class DatabaseConnection {
  static instance = null;
  static sequelize = null;

  static getInstance() {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  constructor() {
    if (DatabaseConnection.sequelize) {
      return;
    }

    DatabaseConnection.sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: "mysql",
        logging: process.env.NODE_ENV === "development" ? console.log : false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      }
    );
  }

  async connect() {
    try {
      await DatabaseConnection.sequelize.authenticate();
      console.log("Database connection established successfully.");
      return DatabaseConnection.sequelize;
    } catch (error) {
      console.error("Unable to connect to the database:", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await DatabaseConnection.sequelize.close();
      console.log("Database connection closed.");
    } catch (error) {
      console.error("Error closing database connection:", error);
      throw error;
    }
  }

  getSequelize() {
    // Ensure sequelize is initialized
    if (!DatabaseConnection.sequelize) {
      // Initialize if not already done
      new DatabaseConnection();
    }
    return DatabaseConnection.sequelize;
  }
}

module.exports = DatabaseConnection;
