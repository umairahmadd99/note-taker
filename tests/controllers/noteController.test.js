const { noteController } = require("../../src/controllers/noteController");
const noteService = require("../../src/services/noteService");
const { createMockUser, createMockNote } = require("../helpers");

// Mock dependencies
jest.mock("../../src/services/noteService");

describe("NoteController", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: createMockUser(),
      body: {},
      params: {},
      query: {},
      file: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe("createNote", () => {
    it("should create a note successfully", async () => {
      req.body = {
        title: "Test Note",
        content: "Test content",
      };

      const mockNote = createMockNote();
      noteService.createNote.mockResolvedValue(mockNote);

      await noteController.createNote(req, res);

      expect(noteService.createNote).toHaveBeenCalledWith(req.user.id, {
        title: "Test Note",
        content: "Test content",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Note created successfully",
        note: mockNote,
      });
    });

    it("should handle create note errors", async () => {
      req.body = {
        title: "Test Note",
        content: "Test content",
      };

      noteService.createNote.mockRejectedValue(new Error("Service error"));

      await noteController.createNote(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to create note",
        details: "Service error",
      });
    });
  });

  describe("getAllNotes", () => {
    it("should get all notes successfully", async () => {
      const mockNotes = [createMockNote(), createMockNote({ id: 2 })];
      noteService.getAllNotes.mockResolvedValue(mockNotes);

      await noteController.getAllNotes(req, res);

      expect(noteService.getAllNotes).toHaveBeenCalledWith(req.user.id);
      expect(res.json).toHaveBeenCalledWith({
        notes: mockNotes,
      });
    });

    it("should handle get all notes errors", async () => {
      noteService.getAllNotes.mockRejectedValue(new Error("Service error"));

      await noteController.getAllNotes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to retrieve notes",
        details: "Service error",
      });
    });
  });

  describe("getNoteById", () => {
    it("should get note by id successfully", async () => {
      req.params.id = "1";
      const mockNote = createMockNote();
      noteService.getNoteById.mockResolvedValue(mockNote);

      await noteController.getNoteById(req, res);

      expect(noteService.getNoteById).toHaveBeenCalledWith(1, req.user.id);
      expect(res.json).toHaveBeenCalledWith({
        note: mockNote,
      });
    });

    it("should return 404 if note not found", async () => {
      req.params.id = "999";
      noteService.getNoteById.mockRejectedValue(
        new Error("Note not found or access denied")
      );

      await noteController.getNoteById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Note not found or access denied",
      });
    });

    it("should handle get note errors", async () => {
      req.params.id = "1";
      noteService.getNoteById.mockRejectedValue(new Error("Service error"));

      await noteController.getNoteById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to retrieve note",
        details: "Service error",
      });
    });
  });

  describe("searchNotes", () => {
    it("should search notes successfully", async () => {
      req.query.keywords = "test";
      const mockNotes = [createMockNote()];
      noteService.searchNotesByKeywords.mockResolvedValue(mockNotes);

      await noteController.searchNotes(req, res);

      expect(noteService.searchNotesByKeywords).toHaveBeenCalledWith(
        req.user.id,
        "test"
      );
      expect(res.json).toHaveBeenCalledWith({
        notes: mockNotes,
        count: 1,
      });
    });

    it("should return error if keywords are missing", async () => {
      req.query = {};

      await noteController.searchNotes(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Keywords parameter is required",
      });
    });

    it("should sanitize keywords", async () => {
      req.query.keywords = "test'; DROP TABLE notes; --";
      const mockNotes = [];
      noteService.searchNotesByKeywords.mockResolvedValue(mockNotes);

      await noteController.searchNotes(req, res);

      expect(noteService.searchNotesByKeywords).toHaveBeenCalledWith(
        req.user.id,
        "test DROP TABLE notes --"
      );
    });

    it("should handle search errors", async () => {
      req.query.keywords = "test";
      noteService.searchNotesByKeywords.mockRejectedValue(
        new Error("Service error")
      );

      await noteController.searchNotes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to search notes",
        details: "Service error",
      });
    });
  });

  describe("updateNote", () => {
    it("should update note successfully", async () => {
      req.params.id = "1";
      req.body = {
        title: "Updated Title",
        content: "Updated content",
        version: 1,
      };

      const mockNote = createMockNote({ title: "Updated Title", version: 2 });
      noteService.updateNote.mockResolvedValue(mockNote);

      await noteController.updateNote(req, res);

      expect(noteService.updateNote).toHaveBeenCalledWith(1, req.user.id, {
        title: "Updated Title",
        content: "Updated content",
        version: 1,
      });
      expect(res.json).toHaveBeenCalledWith({
        message: "Note updated successfully",
        note: mockNote,
      });
    });

    it("should return error if version is missing", async () => {
      req.params.id = "1";
      req.body = {
        title: "Updated Title",
        content: "Updated content",
      };

      await noteController.updateNote(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Version number is required for optimistic locking",
      });
    });

    it("should return 409 for concurrent modification", async () => {
      req.params.id = "1";
      req.body = {
        title: "Updated Title",
        content: "Updated content",
        version: 1,
      };

      noteService.updateNote.mockRejectedValue(
        new Error("Note has been modified by another user")
      );

      await noteController.updateNote(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("should handle update errors", async () => {
      req.params.id = "1";
      req.body = {
        title: "Updated Title",
        content: "Updated content",
        version: 1,
      };

      noteService.updateNote.mockRejectedValue(new Error("Service error"));

      await noteController.updateNote(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("deleteNote", () => {
    it("should delete note successfully", async () => {
      req.params.id = "1";
      noteService.deleteNote.mockResolvedValue({
        message: "Note deleted successfully",
      });

      await noteController.deleteNote(req, res);

      expect(noteService.deleteNote).toHaveBeenCalledWith(1, req.user.id);
      expect(res.json).toHaveBeenCalledWith({
        message: "Note deleted successfully",
      });
    });

    it("should return 404 if note not found", async () => {
      req.params.id = "999";
      noteService.deleteNote.mockRejectedValue(
        new Error("Note not found or permission denied")
      );

      await noteController.deleteNote(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should handle delete errors", async () => {
      req.params.id = "1";
      noteService.deleteNote.mockRejectedValue(new Error("Service error"));

      await noteController.deleteNote(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("revertToVersion", () => {
    it("should revert note to version successfully", async () => {
      req.params.id = "1";
      req.body = { version: 2 };
      const mockNote = createMockNote();
      noteService.revertToVersion.mockResolvedValue(mockNote);

      await noteController.revertToVersion(req, res);

      expect(noteService.revertToVersion).toHaveBeenCalledWith(
        1,
        req.user.id,
        2
      );
      expect(res.json).toHaveBeenCalledWith({
        message: "Note reverted successfully",
        note: mockNote,
      });
    });

    it("should return error if version is missing", async () => {
      req.params.id = "1";
      req.body = {};

      await noteController.revertToVersion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Version number is required",
      });
    });

    it("should return 404 if note or version not found", async () => {
      req.params.id = "999";
      req.body = { version: 2 };
      noteService.revertToVersion.mockRejectedValue(
        new Error("Note not found or permission denied")
      );

      await noteController.revertToVersion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("shareNote", () => {
    it("should share note successfully", async () => {
      req.params.id = "1";
      req.body = {
        sharedWithUserId: 2,
        permission: "read",
      };

      const mockShare = {
        id: 1,
        noteId: 1,
        sharedWithUserId: 2,
        permission: "read",
      };
      noteService.shareNote.mockResolvedValue(mockShare);

      await noteController.shareNote(req, res);

      expect(noteService.shareNote).toHaveBeenCalledWith(1, req.user.id, {
        sharedWithUserId: 2,
        permission: "read",
      });
      expect(res.json).toHaveBeenCalledWith({
        message: "Note shared successfully",
        share: mockShare,
      });
    });

    it("should return error if sharedWithUserId is missing", async () => {
      req.params.id = "1";
      req.body = {};

      await noteController.shareNote(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "sharedWithUserId is required",
      });
    });

    it("should handle share errors", async () => {
      req.params.id = "1";
      req.body = {
        sharedWithUserId: 2,
        permission: "read",
      };

      noteService.shareNote.mockRejectedValue(
        new Error("Note not found or permission denied")
      );

      await noteController.shareNote(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("addAttachment", () => {
    it("should add attachment successfully", async () => {
      req.params.id = "1";
      req.file = {
        filename: "test-file.jpg",
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        size: 1024,
        path: "/uploads/test-file.jpg",
      };

      const mockAttachment = {
        id: 1,
        noteId: 1,
        filename: "test-file.jpg",
      };
      noteService.addAttachment.mockResolvedValue(mockAttachment);

      await noteController.addAttachment(req, res);

      expect(noteService.addAttachment).toHaveBeenCalledWith(
        1,
        req.user.id,
        req.file
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Attachment added successfully",
        attachment: mockAttachment,
      });
    });

    it("should return error if file is missing", async () => {
      req.params.id = "1";
      req.file = null;

      await noteController.addAttachment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "File is required",
      });
    });

    it("should handle add attachment errors", async () => {
      req.params.id = "1";
      req.file = {
        filename: "test-file.jpg",
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        size: 1024,
        path: "/uploads/test-file.jpg",
      };

      noteService.addAttachment.mockRejectedValue(
        new Error("Note not found or permission denied")
      );

      await noteController.addAttachment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
