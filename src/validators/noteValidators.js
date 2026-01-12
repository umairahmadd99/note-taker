const { body } = require("express-validator");
const validate = require("./validate");

/**
 * Validation rules for creating a note
 */
const createNoteValidation = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("content").trim().notEmpty().withMessage("Content is required"),
  validate,
];

/**
 * Validation rules for updating a note
 */
const updateNoteValidation = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("content").trim().notEmpty().withMessage("Content is required"),
  body("version")
    .isInt({ min: 1 })
    .withMessage("Version must be a positive integer"),
  validate,
];

module.exports = {
  createNoteValidation,
  updateNoteValidation,
};
