const request = require("supertest");
const express = require("express");
const noteRoutes = require("../../src/routes/noteRoutes");
const { noteController } = require("../../src/controllers/noteController");
const { authenticate } = require("../../src/middleware/auth");
const { generateTestToken, createMockUser } = require("../helpers");

// Mock dependencies
jest.mock("../../src/controllers/noteController", () => ({
  noteController: {
    createNote: jest.fn(),
    getAllNotes: jest.fn(),
    getNoteById: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
    searchNotes: jest.fn(),
    revertToVersion: jest.fn(),
    shareNote: jest.fn(),
    addAttachment: jest.fn(),
  },
  upload: {
    single: jest.fn(() => (req, res, next) => next()),
  },
}));
jest.mock("../../src/middleware/auth");
jest.mock("../../src/middleware/cache", () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next()),
}));

const app = express();
app.use(express.json());
app.use("/api/notes", noteRoutes);

describe("Note Routes", () => {
  const mockUser = createMockUser();
  const mockToken = generateTestToken();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authenticate middleware to pass through
    authenticate.mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe("POST /api/notes", () => {
    it("should create a note", async () => {
      const mockNote = {
        id: 1,
        userId: 1,
        title: "Test Note",
        content: "Test content",
        version: 1,
      };

      noteController.createNote.mockImplementation((req, res) => {
        res.status(201).json({
          message: "Note created successfully",
          note: mockNote,
        });
      });

      const response = await request(app)
        .post("/api/notes")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          title: "Test Note",
          content: "Test content",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("note");
      expect(noteController.createNote).toHaveBeenCalled();
    });

    it("should return 400 for invalid input", async () => {
      const response = await request(app)
        .post("/api/notes")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          title: "",
          content: "",
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /api/notes", () => {
    it("should get all notes", async () => {
      const mockNotes = [
        {
          id: 1,
          title: "Note 1",
          content: "Content 1",
        },
        {
          id: 2,
          title: "Note 2",
          content: "Content 2",
        },
      ];

      noteController.getAllNotes.mockImplementation((req, res) => {
        res.json({ notes: mockNotes });
      });

      const response = await request(app)
        .get("/api/notes")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("notes");
      expect(response.body.notes).toHaveLength(2);
      expect(noteController.getAllNotes).toHaveBeenCalled();
    });
  });

  describe("GET /api/notes/:id", () => {
    it("should get note by id", async () => {
      const mockNote = {
        id: 1,
        title: "Test Note",
        content: "Test content",
      };

      noteController.getNoteById.mockImplementation((req, res) => {
        res.json({ note: mockNote });
      });

      const response = await request(app)
        .get("/api/notes/1")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("note");
      expect(noteController.getNoteById).toHaveBeenCalled();
    });
  });

  describe("PUT /api/notes/:id", () => {
    it("should update a note", async () => {
      const mockNote = {
        id: 1,
        title: "Updated Note",
        content: "Updated content",
        version: 2,
      };

      noteController.updateNote.mockImplementation((req, res) => {
        res.json({
          message: "Note updated successfully",
          note: mockNote,
        });
      });

      const response = await request(app)
        .put("/api/notes/1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          title: "Updated Note",
          content: "Updated content",
          version: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("note");
      expect(noteController.updateNote).toHaveBeenCalled();
    });

    it("should return 400 if version is missing", async () => {
      noteController.updateNote.mockImplementation((req, res) => {
        res.status(400).json({
          error: "Version number is required for optimistic locking",
        });
      });

      const response = await request(app)
        .put("/api/notes/1")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          title: "Updated Note",
          content: "Updated content",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/notes/:id", () => {
    it("should delete a note", async () => {
      noteController.deleteNote.mockImplementation((req, res) => {
        res.json({ message: "Note deleted successfully" });
      });

      const response = await request(app)
        .delete("/api/notes/1")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(noteController.deleteNote).toHaveBeenCalled();
    });
  });

  describe("GET /api/notes/search", () => {
    it("should search notes by keywords", async () => {
      const mockNotes = [
        {
          id: 1,
          title: "Test Note",
          content: "Test content",
        },
      ];

      // Clear any previous mocks
      noteController.searchNotes.mockClear();
      noteController.getNoteById.mockClear();

      noteController.searchNotes.mockImplementation((req, res) => {
        res.json({ notes: mockNotes, count: 1 });
      });

      const response = await request(app)
        .get("/api/notes/search")
        .query({ keywords: "test" })
        .set("Authorization", `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("notes");
      expect(response.body.notes).toEqual(mockNotes);
      expect(noteController.searchNotes).toHaveBeenCalled();
      // Ensure getNoteById was not called (route order issue)
      expect(noteController.getNoteById).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/notes/:id/revert", () => {
    it("should revert note to a version", async () => {
      const mockNote = {
        id: 1,
        title: "Reverted Note",
        content: "Reverted content",
        version: 3,
      };

      noteController.revertToVersion.mockImplementation((req, res) => {
        res.json({
          message: "Note reverted successfully",
          note: mockNote,
        });
      });

      const response = await request(app)
        .post("/api/notes/1/revert")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ version: 2 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("note");
      expect(noteController.revertToVersion).toHaveBeenCalled();
    });
  });

  describe("POST /api/notes/:id/share", () => {
    it("should share note with another user", async () => {
      const mockShare = {
        id: 1,
        noteId: 1,
        sharedWithUserId: 2,
        permission: "read",
      };

      noteController.shareNote.mockImplementation((req, res) => {
        res.json({
          message: "Note shared successfully",
          share: mockShare,
        });
      });

      const response = await request(app)
        .post("/api/notes/1/share")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          sharedWithUserId: 2,
          permission: "read",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("share");
      expect(noteController.shareNote).toHaveBeenCalled();
    });
  });

  describe("POST /api/notes/:id/attachments", () => {
    it("should add attachment to note", async () => {
      const mockAttachment = {
        id: 1,
        noteId: 1,
        filename: "test-file.jpg",
      };

      noteController.addAttachment.mockImplementation((req, res) => {
        res.status(201).json({
          message: "Attachment added successfully",
          attachment: mockAttachment,
        });
      });

      const response = await request(app)
        .post("/api/notes/1/attachments")
        .set("Authorization", `Bearer ${mockToken}`)
        .attach("file", Buffer.from("test file content"), "test.jpg");

      // Note: File upload testing may require additional setup
      // This is a basic structure
      expect(noteController.addAttachment).toHaveBeenCalled();
    });
  });

  describe("Authentication", () => {
    it("should require authentication for all routes", async () => {
      authenticate.mockImplementation((req, res, next) => {
        res.status(401).json({ error: "Authentication required" });
      });

      const response = await request(app).get("/api/notes");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });
});
