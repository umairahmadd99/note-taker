const { DataTypes } = require("sequelize");
const DatabaseConnection = require("../config/database");

const sequelize = DatabaseConnection.getInstance().getSequelize();

const NoteVersion = sequelize.define(
  "NoteVersion",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    noteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "notes",
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    changedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    tableName: "note_versions",
    timestamps: true,
    indexes: [
      {
        fields: ["noteId"],
      },
      {
        fields: ["version"],
      },
    ],
  }
);

module.exports = NoteVersion;
