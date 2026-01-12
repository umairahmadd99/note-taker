const express = require("express");
const router = express.Router();
const { noteController, upload } = require("../controllers/noteController");
const { authenticate } = require("../middleware/auth");
const { cacheMiddleware } = require("../middleware/cache");
const {
  createNoteValidation,
  updateNoteValidation,
} = require("../validators/noteValidators");

// All note routes require authentication
router.use(authenticate);

// Routes
router
  .route("/")
  .post(createNoteValidation, noteController.createNote)
  .get(cacheMiddleware(300), noteController.getAllNotes);
router
  .route("/:id")
  .get(cacheMiddleware(300), noteController.getNoteById)
  .put(updateNoteValidation, noteController.updateNote)
  .delete(noteController.deleteNote);
router.get("/search", cacheMiddleware(300), noteController.searchNotes);
router.post("/:id/revert", noteController.revertToVersion);
router.post("/:id/share", noteController.shareNote);
router.post(
  "/:id/attachments",
  upload.single("file"),
  noteController.addAttachment
);

module.exports = router;
