const {
  Note,
  NoteVersion,
  NoteShare,
  User,
  NoteAttachment,
} = require("../models");
const { Op, Sequelize } = require("sequelize");
const DatabaseConnection = require("../config/database");
const { invalidateCache } = require("../middleware/cache");

const sequelize = DatabaseConnection.getInstance().getSequelize();

class NoteService {
  /**
   * Create a new note with versioning
   */
  async createNote(userId, { title, content }) {
    const note = await Note.create({
      userId,
      title,
      content,
      version: 1,
    });

    // Create initial version
    await NoteVersion.create({
      noteId: note.id,
      title,
      content,
      version: 1,
      changedBy: userId,
    });

    // Invalidate user's notes cache (all note-related endpoints)
    await invalidateCache(`cache:/api/v1/notes*:${userId}`);

    return note;
  }

  /**
   * Get all notes for a user (including shared notes)
   */
  async getAllNotes(userId) {
    const { Op } = require("sequelize");

    const notes = await Note.findAll({
      where: {
        deletedAt: null,
        [Op.or]: [
          { userId },
          {
            "$shares.sharedWithUserId$": userId,
          },
        ],
      },
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "username", "email"],
        },
        {
          model: NoteShare,
          as: "shares",
          required: false,
          include: [
            {
              model: User,
              as: "sharedWithUser",
              attributes: ["id", "username", "email"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      distinct: true, // Important: prevents duplicate rows from JOIN
    });

    return notes;
  }

  /**
   * Get a specific note by ID
   */
  async getNoteById(noteId, userId) {
    const note = await Note.findOne({
      where: {
        id: noteId,
        [Op.or]: [{ userId }, { "$shares.sharedWithUserId$": userId }],
        deletedAt: null,
      },
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "username", "email"],
        },
        {
          model: NoteVersion,
          as: "versions",
          order: [["version", "DESC"]],
          include: [
            {
              model: User,
              as: "changedByUser",
              attributes: ["id", "username", "email"],
            },
          ],
        },
        {
          model: NoteAttachment,
          as: "attachments",
        },
        {
          model: NoteShare,
          as: "shares",
          include: [
            {
              model: User,
              as: "sharedWithUser",
              attributes: ["id", "username", "email"],
            },
          ],
        },
      ],
    });

    if (!note) {
      throw new Error("Note not found or access denied");
    }

    return note;
  }

  /**
   * Search notes by keywords using full-text search
   */
  async searchNotesByKeywords(userId, keywords) {
    const notes = await Note.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [{ userId }, { "$shares.sharedWithUserId$": userId }],
          },
          {
            deletedAt: null,
          },
          {
            [Op.or]: [
              // Use escaped keywords in FULLTEXT search
              Sequelize.literal(
                `MATCH(title, content) AGAINST('${keywords}' IN NATURAL LANGUAGE MODE)`
              ),
              {
                title: { [Op.like]: `%${keywords}%` },
              },
              {
                content: { [Op.like]: `%${keywords}%` },
              },
            ],
          },
        ],
      },
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "username", "email"],
        },
        {
          model: NoteShare,
          as: "shares",
          where: { sharedWithUserId: userId },
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return notes;
  }

  /**
   * Update a note with optimistic locking and versioning
   */
  async updateNote(
    noteId,
    userId,
    { title, content, version: expectedVersion }
  ) {
    const transaction = await Note.sequelize.transaction();

    try {
      // Check if user has permission (owner or shared with edit permission)
      const note = await Note.findOne({
        where: {
          id: noteId,
          deletedAt: null,
        },
        include: [
          {
            model: NoteShare,
            as: "shares",
            where: {
              sharedWithUserId: userId,
              permission: "edit",
            },
            required: false,
          },
        ],
        transaction,
      });

      if (!note) {
        throw new Error("Note not found");
      }

      // Check if user is owner or has edit permission
      const isOwner = note.userId === userId;
      const hasEditPermission = note.shares && note.shares.length > 0;

      if (!isOwner && !hasEditPermission) {
        throw new Error("Permission denied");
      }

      // Optimistic locking: check version
      if (note.version !== expectedVersion) {
        throw new Error(
          "Note has been modified by another user. Please refresh and try again."
        );
      }

      // Update note
      note.title = title;
      note.content = content;
      note.version = note.version + 1;
      await note.save({ transaction });

      // Create new version
      await NoteVersion.create(
        {
          noteId: note.id,
          title,
          content,
          version: note.version,
          changedBy: userId,
        },
        { transaction }
      );

      await transaction.commit();

      // Invalidate cache (all note-related endpoints for this user)
      await invalidateCache(`cache:/api/v1/notes*:${userId}`);

      return note;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Soft delete a note
   */
  async deleteNote(noteId, userId) {
    const note = await Note.findOne({
      where: {
        id: noteId,
        userId, // Only owner can delete
        deletedAt: null,
      },
    });

    if (!note) {
      throw new Error("Note not found or permission denied");
    }

    await note.destroy(); // Soft delete

    // Invalidate cache (all note-related endpoints for this user)
    await invalidateCache(`cache:/api/v1/notes*:${userId}`);

    return { message: "Note deleted successfully" };
  }

  /**
   * Revert note to a previous version
   */
  async revertToVersion(noteId, userId, targetVersion) {
    const transaction = await Note.sequelize.transaction();

    try {
      const note = await Note.findOne({
        where: {
          id: noteId,
          userId, // Only owner can revert
          deletedAt: null,
        },
        transaction,
      });

      if (!note) {
        throw new Error("Note not found or permission denied");
      }

      const targetVersionRecord = await NoteVersion.findOne({
        where: {
          noteId,
          version: targetVersion,
        },
        transaction,
      });

      if (!targetVersionRecord) {
        throw new Error("Version not found");
      }

      // Update note to target version
      note.title = targetVersionRecord.title;
      note.content = targetVersionRecord.content;
      note.version = note.version + 1;
      await note.save({ transaction });

      // Create new version from reverted content
      await NoteVersion.create(
        {
          noteId: note.id,
          title: targetVersionRecord.title,
          content: targetVersionRecord.content,
          version: note.version,
          changedBy: userId,
        },
        { transaction }
      );

      await transaction.commit();

      // Invalidate cache (all note-related endpoints for this user)
      await invalidateCache(`cache:/api/v1/notes*:${userId}`);

      return note;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Share note with another user
   */
  async shareNote(noteId, ownerId, { sharedWithUserId, permission }) {
    if (ownerId === sharedWithUserId) {
      throw new Error("Cannot share note with yourself");
    }

    const note = await Note.findOne({
      where: {
        id: noteId,
        userId: ownerId,
        deletedAt: null,
      },
    });

    if (!note) {
      throw new Error("Note not found or permission denied");
    }

    // Check if user exists
    const sharedUser = await User.findByPk(sharedWithUserId);
    if (!sharedUser) {
      throw new Error("User not found");
    }

    // Create or update share
    const [share, created] = await NoteShare.findOrCreate({
      where: {
        noteId,
        sharedWithUserId,
      },
      defaults: {
        noteId,
        sharedWithUserId,
        permission: permission || "read",
      },
    });

    if (!created) {
      share.permission = permission || "read";
      await share.save();
    }

    // Invalidate cache for both users
    // Invalidate cache for both owner and shared user
    await invalidateCache(`cache:/api/v1/notes*:${ownerId}`);
    await invalidateCache(`cache:/api/v1/notes*:${sharedWithUserId}`);

    return share;
  }

  /**
   * Add attachment to note
   */
  async addAttachment(noteId, userId, file) {
    const note = await Note.findOne({
      where: {
        id: noteId,
        [Op.or]: [
          { userId },
          {
            "$shares.sharedWithUserId$": userId,
            "$shares.permission$": "edit",
          },
        ],
        deletedAt: null,
      },
      include: [
        {
          model: NoteShare,
          as: "shares",
          where: {
            sharedWithUserId: userId,
            permission: "edit",
          },
          required: false,
        },
      ],
    });

    if (!note) {
      throw new Error("Note not found or permission denied");
    }

    const attachment = await NoteAttachment.create({
      noteId,
      filename: file.filename,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      filePath: file.path,
    });

    // Invalidate cache
    // Invalidate cache for this specific note
    await invalidateCache(`cache:/api/v1/notes*:${userId}`);

    return attachment;
  }
}

module.exports = new NoteService();
