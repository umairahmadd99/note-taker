"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("note_shares", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      noteId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "notes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sharedWithUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      permission: {
        type: Sequelize.ENUM("read", "edit"),
        allowNull: false,
        defaultValue: "read",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });

    // Add unique index for noteId and sharedWithUserId combination
    await queryInterface.addIndex(
      "note_shares",
      ["noteId", "sharedWithUserId"],
      {
        unique: true,
        name: "unique_note_share",
      }
    );
    await queryInterface.addIndex("note_shares", ["sharedWithUserId"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("note_shares");
  },
};
