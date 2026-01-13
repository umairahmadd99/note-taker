// Mock dependencies BEFORE importing anything that uses them
jest.mock("../../src/config/database", () => ({
  getInstance: jest.fn(() => ({
    getSequelize: jest.fn(() => ({
      define: jest.fn(),
      transaction: jest.fn(),
    })),
  })),
}));

jest.mock("../../src/models", () => ({
  Note: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    sequelize: {
      transaction: jest.fn().mockResolvedValue({
        commit: jest.fn().mockResolvedValue(true),
        rollback: jest.fn().mockResolvedValue(true),
      }),
    },
  },
  NoteVersion: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
  NoteShare: {
    findOrCreate: jest.fn(),
  },
  User: {
    findByPk: jest.fn(),
  },
  NoteAttachment: {
    create: jest.fn(),
  },
}));

jest.mock("../../src/middleware/cache");

const noteService = require("../../src/services/noteService");
const {
  Note,
  NoteVersion,
  NoteShare,
  User,
  NoteAttachment,
} = require("../../src/models");
const DatabaseConnection = require("../../src/config/database");
const { invalidateCache } = require("../../src/middleware/cache");
const { Op } = require("sequelize");

describe("NoteService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateCache.mockResolvedValue(undefined);
  });

  describe("createNote", () => {
    it("should create a note with initial version", async () => {
      const userId = 1;
      const noteData = {
        title: "Test Note",
        content: "Test content",
      };

      const mockNote = {
        id: 1,
        userId: 1,
        title: "Test Note",
        content: "Test content",
        version: 1,
      };

      Note.create.mockResolvedValue(mockNote);
      NoteVersion.create.mockResolvedValue({});

      const result = await noteService.createNote(userId, noteData);

      expect(Note.create).toHaveBeenCalledWith({
        userId: 1,
        title: "Test Note",
        content: "Test content",
        version: 1,
      });
      expect(NoteVersion.create).toHaveBeenCalledWith({
        noteId: 1,
        title: "Test Note",
        content: "Test content",
        version: 1,
        changedBy: 1,
      });
      expect(invalidateCache).toHaveBeenCalledWith("cache:/api/notes*:1");
      expect(result).toEqual(mockNote);
    });
  });

  describe("getAllNotes", () => {
    it("should get all notes for a user including shared notes", async () => {
      const userId = 1;
      const mockNotes = [
        {
          id: 1,
          userId: 1,
          title: "My Note",
          content: "Content",
        },
        {
          id: 2,
          userId: 2,
          title: "Shared Note",
          content: "Shared content",
        },
      ];

      Note.findAll.mockResolvedValue(mockNotes);

      const result = await noteService.getAllNotes(userId);

      expect(Note.findAll).toHaveBeenCalled();
      const callArgs = Note.findAll.mock.calls[0][0];
      expect(callArgs.where.deletedAt).toBe(null);
      expect(callArgs.order).toEqual([["createdAt", "DESC"]]);
      expect(callArgs.distinct).toBe(true);
      expect(callArgs.include).toBeDefined();
      expect(result).toEqual(mockNotes);
    });
  });

  describe("getNoteById", () => {
    it("should get note by id if user has access", async () => {
      const noteId = 1;
      const userId = 1;
      const mockNote = {
        id: 1,
        userId: 1,
        title: "Test Note",
        content: "Content",
      };

      Note.findOne.mockResolvedValue(mockNote);

      const result = await noteService.getNoteById(noteId, userId);

      expect(Note.findOne).toHaveBeenCalled();
      const callArgs = Note.findOne.mock.calls[0][0];
      expect(callArgs.where.id).toBe(1);
      expect(callArgs.where.deletedAt).toBe(null);
      expect(callArgs.include).toBeDefined();
      expect(result).toEqual(mockNote);
    });

    it("should throw error if note not found or access denied", async () => {
      const noteId = 999;
      const userId = 1;

      Note.findOne.mockResolvedValue(null);

      await expect(noteService.getNoteById(noteId, userId)).rejects.toThrow(
        "Note not found or access denied"
      );
    });
  });

  describe("searchNotesByKeywords", () => {
    it("should search notes by keywords", async () => {
      const userId = 1;
      const keywords = "test";
      const mockNotes = [
        {
          id: 1,
          title: "Test Note",
          content: "Test content",
        },
      ];

      Note.findAll.mockResolvedValue(mockNotes);

      const result = await noteService.searchNotesByKeywords(userId, keywords);

      expect(Note.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockNotes);
    });
  });

  describe("updateNote", () => {
    it("should update note with optimistic locking", async () => {
      const noteId = 1;
      const userId = 1;
      const updateData = {
        title: "Updated Title",
        content: "Updated content",
        version: 1,
      };

      const mockNote = {
        id: 1,
        userId: 1,
        title: "Original Title",
        content: "Original content",
        version: 1,
        save: jest.fn().mockResolvedValue(true),
        shares: [],
      };

      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(true),
        rollback: jest.fn().mockResolvedValue(true),
      };

      Note.sequelize.transaction.mockResolvedValue(mockTransaction);
      Note.findOne.mockResolvedValue(mockNote);
      NoteVersion.create.mockResolvedValue({});

      const result = await noteService.updateNote(noteId, userId, updateData);

      expect(Note.findOne).toHaveBeenCalled();
      expect(mockNote.save).toHaveBeenCalled();
      expect(NoteVersion.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(invalidateCache).toHaveBeenCalledWith("cache:/api/notes*:1");
    });

    it("should throw error if version mismatch (optimistic locking)", async () => {
      const noteId = 1;
      const userId = 1;
      const updateData = {
        title: "Updated Title",
        content: "Updated content",
        version: 1,
      };

      const mockNote = {
        id: 1,
        userId: 1,
        version: 2, // Different version
        shares: [],
      };

      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(true),
        rollback: jest.fn().mockResolvedValue(true),
      };

      Note.sequelize.transaction.mockResolvedValue(mockTransaction);
      Note.findOne.mockResolvedValue(mockNote);

      await expect(
        noteService.updateNote(noteId, userId, updateData)
      ).rejects.toThrow("Note has been modified by another user");

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("should throw error if user does not have permission", async () => {
      const noteId = 1;
      const userId = 2; // Different user
      const updateData = {
        title: "Updated Title",
        content: "Updated content",
        version: 1,
      };

      const mockNote = {
        id: 1,
        userId: 1, // Owner is different
        version: 1,
        shares: [], // No shared access
      };

      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(true),
        rollback: jest.fn().mockResolvedValue(true),
      };

      Note.sequelize.transaction.mockResolvedValue(mockTransaction);
      Note.findOne.mockResolvedValue(mockNote);

      await expect(
        noteService.updateNote(noteId, userId, updateData)
      ).rejects.toThrow("Permission denied");

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe("deleteNote", () => {
    it("should soft delete a note", async () => {
      const noteId = 1;
      const userId = 1;

      const mockNote = {
        id: 1,
        userId: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };

      Note.findOne.mockResolvedValue(mockNote);

      const result = await noteService.deleteNote(noteId, userId);

      expect(Note.findOne).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: 1,
          deletedAt: null,
        },
      });
      expect(mockNote.destroy).toHaveBeenCalled();
      expect(invalidateCache).toHaveBeenCalledWith("cache:/api/notes*:1");
      expect(result).toEqual({ message: "Note deleted successfully" });
    });

    it("should throw error if note not found or permission denied", async () => {
      const noteId = 999;
      const userId = 1;

      Note.findOne.mockResolvedValue(null);

      await expect(noteService.deleteNote(noteId, userId)).rejects.toThrow(
        "Note not found or permission denied"
      );
    });
  });

  describe("revertToVersion", () => {
    it("should revert note to a previous version", async () => {
      const noteId = 1;
      const userId = 1;
      const targetVersion = 2;

      const mockNote = {
        id: 1,
        userId: 1,
        version: 3,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockVersion = {
        id: 1,
        noteId: 1,
        version: 2,
        title: "Version 2 Title",
        content: "Version 2 Content",
      };

      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(true),
        rollback: jest.fn().mockResolvedValue(true),
      };

      Note.sequelize.transaction.mockResolvedValue(mockTransaction);
      Note.findOne.mockResolvedValue(mockNote);
      NoteVersion.findOne.mockResolvedValue(mockVersion);
      NoteVersion.create.mockResolvedValue({});

      const result = await noteService.revertToVersion(
        noteId,
        userId,
        targetVersion
      );

      expect(Note.findOne).toHaveBeenCalled();
      expect(NoteVersion.findOne).toHaveBeenCalledWith({
        where: {
          noteId: 1,
          version: 2,
        },
        transaction: mockTransaction,
      });
      expect(mockNote.save).toHaveBeenCalled();
      expect(NoteVersion.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(invalidateCache).toHaveBeenCalledWith("cache:/api/notes*:1");
    });

    it("should throw error if version not found", async () => {
      const noteId = 1;
      const userId = 1;
      const targetVersion = 999;

      const mockNote = {
        id: 1,
        userId: 1,
      };

      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(true),
        rollback: jest.fn().mockResolvedValue(true),
      };

      Note.sequelize.transaction.mockResolvedValue(mockTransaction);
      Note.findOne.mockResolvedValue(mockNote);
      NoteVersion.findOne.mockResolvedValue(null);

      await expect(
        noteService.revertToVersion(noteId, userId, targetVersion)
      ).rejects.toThrow("Version not found");

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe("shareNote", () => {
    it("should share note with another user", async () => {
      const noteId = 1;
      const ownerId = 1;
      const shareData = {
        sharedWithUserId: 2,
        permission: "read",
      };

      const mockNote = {
        id: 1,
        userId: 1,
      };

      const mockSharedUser = {
        id: 2,
        username: "shareduser",
      };

      const mockShare = {
        id: 1,
        noteId: 1,
        sharedWithUserId: 2,
        permission: "read",
        save: jest.fn().mockResolvedValue(true),
      };

      Note.findOne.mockResolvedValue(mockNote);
      User.findByPk.mockResolvedValue(mockSharedUser);
      NoteShare.findOrCreate.mockResolvedValue([mockShare, true]);

      const result = await noteService.shareNote(noteId, ownerId, shareData);

      expect(Note.findOne).toHaveBeenCalled();
      expect(User.findByPk).toHaveBeenCalledWith(2);
      expect(NoteShare.findOrCreate).toHaveBeenCalled();
      expect(invalidateCache).toHaveBeenCalledWith("cache:/api/notes*:1");
      expect(invalidateCache).toHaveBeenCalledWith("cache:/api/notes*:2");
    });

    it("should throw error if trying to share with yourself", async () => {
      const noteId = 1;
      const ownerId = 1;
      const shareData = {
        sharedWithUserId: 1, // Same as owner
        permission: "read",
      };

      await expect(
        noteService.shareNote(noteId, ownerId, shareData)
      ).rejects.toThrow("Cannot share note with yourself");
    });

    it("should throw error if user not found", async () => {
      const noteId = 1;
      const ownerId = 1;
      const shareData = {
        sharedWithUserId: 999,
        permission: "read",
      };

      const mockNote = {
        id: 1,
        userId: 1,
      };

      Note.findOne.mockResolvedValue(mockNote);
      User.findByPk.mockResolvedValue(null);

      await expect(
        noteService.shareNote(noteId, ownerId, shareData)
      ).rejects.toThrow("User not found");
    });
  });

  describe("addAttachment", () => {
    it("should add attachment to note", async () => {
      const noteId = 1;
      const userId = 1;
      const file = {
        filename: "test-file.jpg",
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        size: 1024,
        path: "/uploads/test-file.jpg",
      };

      const mockNote = {
        id: 1,
        userId: 1,
        shares: [],
      };

      const mockAttachment = {
        id: 1,
        noteId: 1,
        filename: "test-file.jpg",
      };

      Note.findOne.mockResolvedValue(mockNote);
      NoteAttachment.create.mockResolvedValue(mockAttachment);

      const result = await noteService.addAttachment(noteId, userId, file);

      expect(Note.findOne).toHaveBeenCalled();
      expect(NoteAttachment.create).toHaveBeenCalledWith({
        noteId: 1,
        filename: "test-file.jpg",
        originalFilename: "test.jpg",
        mimeType: "image/jpeg",
        fileSize: 1024,
        filePath: "/uploads/test-file.jpg",
      });
      expect(invalidateCache).toHaveBeenCalledWith("cache:/api/notes*:1");
      expect(result).toEqual(mockAttachment);
    });

    it("should throw error if note not found or permission denied", async () => {
      const noteId = 999;
      const userId = 1;
      const file = {
        filename: "test-file.jpg",
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        size: 1024,
        path: "/uploads/test-file.jpg",
      };

      Note.findOne.mockResolvedValue(null);

      await expect(
        noteService.addAttachment(noteId, userId, file)
      ).rejects.toThrow("Note not found or permission denied");
    });
  });
});
