const { DataTypes } = require("sequelize");
const DatabaseConnection = require("../config/database");

const sequelize = DatabaseConnection.getInstance().getSequelize();

const NoteAttachment = sequelize.define(
  "NoteAttachment",
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
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    originalFilename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
  },
  {
    tableName: "note_attachments",
    timestamps: true,
    indexes: [
      {
        fields: ["noteId"],
      },
    ],
  }
);

module.exports = NoteAttachment;
