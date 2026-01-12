const noteService = require("../services/noteService");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and videos are allowed."));
    }
  },
});

class NoteController {
  async createNote(req, res) {
    try {
      const { title, content } = req.body;
      const userId = req.user.id;

      const note = await noteService.createNote(userId, { title, content });

      res.status(201).json({
        message: "Note created successfully",
        note,
      });
    } catch (error) {
      console.error("Create note error:", error);
      res
        .status(500)
        .json({ error: "Failed to create note", details: error.message });
    }
  }

  async getAllNotes(req, res) {
    try {
      const userId = req.user.id;
      const notes = await noteService.getAllNotes(userId);

      res.json({
        notes,
      });
    } catch (error) {
      console.error("Get all notes error:", error);
      res
        .status(500)
        .json({ error: "Failed to retrieve notes", details: error.message });
    }
  }

  async getNoteById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const note = await noteService.getNoteById(parseInt(id), userId);

      res.json({
        note,
      });
    } catch (error) {
      console.error("Get note error:", error);
      if (error.message === "Note not found or access denied") {
        return res.status(404).json({ error: error.message });
      }
      res
        .status(500)
        .json({ error: "Failed to retrieve note", details: error.message });
    }
  }

  async searchNotes(req, res) {
    try {
      const { keywords } = req.query;
      const userId = req.user.id;

      if (!keywords) {
        return res
          .status(400)
          .json({ error: "Keywords parameter is required" });
      }

      // Sanitize keywords to prevent SQL injection
      const sanitizedKeywords = keywords
        .trim()
        .replace(/['";\\]/g, "") // Remove SQL injection characters
        .substring(0, 255);

      if (!sanitizedKeywords) {
        return res.status(400).json({ error: "Invalid keywords provided" });
      }

      const notes = await noteService.searchNotesByKeywords(
        userId,
        sanitizedKeywords
      );

      res.json({
        notes,
        count: notes.length,
      });
    } catch (error) {
      console.error("Search notes error:", error);
      res
        .status(500)
        .json({ error: "Failed to search notes", details: error.message });
    }
  }

  async updateNote(req, res) {
    try {
      const { id } = req.params;
      const { title, content, version } = req.body;
      const userId = req.user.id;

      if (!version) {
        return res
          .status(400)
          .json({ error: "Version number is required for optimistic locking" });
      }

      const note = await noteService.updateNote(parseInt(id), userId, {
        title,
        content,
        version: parseInt(version),
      });

      res.json({
        message: "Note updated successfully",
        note,
      });
    } catch (error) {
      console.error("Update note error:", error);
      if (error.message.includes("modified by another user")) {
        return res.status(409).json({ error: error.message });
      }
      if (
        error.message === "Note not found" ||
        error.message === "Permission denied"
      ) {
        return res.status(404).json({ error: error.message });
      }
      res
        .status(500)
        .json({ error: "Failed to update note", details: error.message });
    }
  }

  async deleteNote(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await noteService.deleteNote(parseInt(id), userId);

      res.json(result);
    } catch (error) {
      console.error("Delete note error:", error);
      if (error.message === "Note not found or permission denied") {
        return res.status(404).json({ error: error.message });
      }
      res
        .status(500)
        .json({ error: "Failed to delete note", details: error.message });
    }
  }

  async revertToVersion(req, res) {
    try {
      const { id } = req.params;
      const { version } = req.body;
      const userId = req.user.id;

      if (!version) {
        return res.status(400).json({ error: "Version number is required" });
      }

      const note = await noteService.revertToVersion(
        parseInt(id),
        userId,
        parseInt(version)
      );

      res.json({
        message: "Note reverted successfully",
        note,
      });
    } catch (error) {
      console.error("Revert note error:", error);
      if (
        error.message === "Note not found or permission denied" ||
        error.message === "Version not found"
      ) {
        return res.status(404).json({ error: error.message });
      }
      res
        .status(500)
        .json({ error: "Failed to revert note", details: error.message });
    }
  }

  async shareNote(req, res) {
    try {
      const { id } = req.params;
      const { sharedWithUserId, permission } = req.body;
      const userId = req.user.id;

      if (!sharedWithUserId) {
        return res.status(400).json({ error: "sharedWithUserId is required" });
      }

      const share = await noteService.shareNote(parseInt(id), userId, {
        sharedWithUserId: parseInt(sharedWithUserId),
        permission: permission || "read",
      });

      res.json({
        message: "Note shared successfully",
        share,
      });
    } catch (error) {
      console.error("Share note error:", error);
      if (
        error.message === "Note not found or permission denied" ||
        error.message === "User not found" ||
        error.message === "Cannot share note with yourself"
      ) {
        return res.status(400).json({ error: error.message });
      }
      res
        .status(500)
        .json({ error: "Failed to share note", details: error.message });
    }
  }

  async addAttachment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      const attachment = await noteService.addAttachment(
        parseInt(id),
        userId,
        req.file
      );

      res.status(201).json({
        message: "Attachment added successfully",
        attachment,
      });
    } catch (error) {
      console.error("Add attachment error:", error);
      if (error.message === "Note not found or permission denied") {
        return res.status(404).json({ error: error.message });
      }
      res
        .status(500)
        .json({ error: "Failed to add attachment", details: error.message });
    }
  }
}

module.exports = {
  noteController: new NoteController(),
  upload,
};
