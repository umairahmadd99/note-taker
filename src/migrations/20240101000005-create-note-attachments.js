"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("note_attachments", {
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
      filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      originalFilename: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      mimeType: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      filePath: {
        type: Sequelize.STRING(500),
        allowNull: false,
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

    // Add index
    await queryInterface.addIndex("note_attachments", ["noteId"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("note_attachments");
  },
};
