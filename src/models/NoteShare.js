const { DataTypes } = require("sequelize");
const DatabaseConnection = require("../config/database");

const sequelize = DatabaseConnection.getInstance().getSequelize();

const NoteShare = sequelize.define(
  "NoteShare",
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
    sharedWithUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    permission: {
      type: DataTypes.ENUM("read", "edit"),
      allowNull: false,
      defaultValue: "read",
    },
  },
  {
    tableName: "note_shares",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["noteId", "sharedWithUserId"],
      },
      {
        fields: ["sharedWithUserId"],
      },
    ],
  }
);

module.exports = NoteShare;
