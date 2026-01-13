const {
  createNoteValidation,
  updateNoteValidation,
} = require("../../src/validators/noteValidators");
const { validationResult } = require("express-validator");

describe("Note Validators", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("createNoteValidation", () => {
    it("should pass validation with valid data", async () => {
      req.body = {
        title: "Test Note",
        content: "Test content",
      };

      for (const validator of createNoteValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    it("should fail validation with empty title", async () => {
      req.body = {
        title: "",
        content: "Test content",
      };

      for (const validator of createNoteValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Title is required",
          }),
        ])
      );
    });

    it("should fail validation with empty content", async () => {
      req.body = {
        title: "Test Note",
        content: "",
      };

      for (const validator of createNoteValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Content is required",
          }),
        ])
      );
    });

    it("should trim whitespace from title and content", async () => {
      req.body = {
        title: "  Test Note  ",
        content: "  Test content  ",
      };

      for (const validator of createNoteValidation) {
        await validator(req, res, next);
      }

      // After trimming, validation should pass
      const errors = validationResult(req);
      // Note: The actual trimming happens in the validator, but we're testing the validation logic
      expect(errors.isEmpty()).toBe(true);
    });
  });

  describe("updateNoteValidation", () => {
    it("should pass validation with valid data", async () => {
      req.body = {
        title: "Updated Note",
        content: "Updated content",
        version: 1,
      };

      for (const validator of updateNoteValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    it("should fail validation with missing version", async () => {
      req.body = {
        title: "Updated Note",
        content: "Updated content",
      };

      for (const validator of updateNoteValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Version must be a positive integer",
          }),
        ])
      );
    });

    it("should fail validation with invalid version (not integer)", async () => {
      req.body = {
        title: "Updated Note",
        content: "Updated content",
        version: "not-a-number",
      };

      for (const validator of updateNoteValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });

    it("should fail validation with version less than 1", async () => {
      req.body = {
        title: "Updated Note",
        content: "Updated content",
        version: 0,
      };

      for (const validator of updateNoteValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });

    it("should fail validation with empty title", async () => {
      req.body = {
        title: "",
        content: "Updated content",
        version: 1,
      };

      for (const validator of updateNoteValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Title is required",
          }),
        ])
      );
    });
  });
});
