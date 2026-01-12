const { DataTypes } = require("sequelize");
const DatabaseConnection = require("../config/database");

const sequelize = DatabaseConnection.getInstance().getSequelize();

const Note = sequelize.define(
  "Note",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "notes",
    timestamps: true,
    paranoid: true, // Enables soft deletion
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["deletedAt"],
      },
      {
        type: "FULLTEXT",
        fields: ["title", "content"],
      },
    ],
  }
);

module.exports = Note;
