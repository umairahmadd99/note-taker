const {
  registerValidation,
  loginValidation,
} = require("../../src/validators/authValidators");
const { body, validationResult } = require("express-validator");

describe("Auth Validators", () => {
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

  describe("registerValidation", () => {
    it("should pass validation with valid data", async () => {
      req.body = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      // Run all validators
      for (const validator of registerValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    it("should fail validation with short username", async () => {
      req.body = {
        username: "ab", // Too short
        email: "test@example.com",
        password: "password123",
      };

      for (const validator of registerValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Username must be between 3 and 50 characters",
          }),
        ])
      );
    });

    it("should fail validation with invalid email", async () => {
      req.body = {
        username: "testuser",
        email: "invalid-email",
        password: "password123",
      };

      for (const validator of registerValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Please provide a valid email",
          }),
        ])
      );
    });

    it("should fail validation with short password", async () => {
      req.body = {
        username: "testuser",
        email: "test@example.com",
        password: "12345", // Too short
      };

      for (const validator of registerValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Password must be at least 6 characters long",
          }),
        ])
      );
    });
  });

  describe("loginValidation", () => {
    it("should pass validation with valid data", async () => {
      req.body = {
        email: "test@example.com",
        password: "password123",
      };

      for (const validator of loginValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    it("should fail validation with invalid email", async () => {
      req.body = {
        email: "invalid-email",
        password: "password123",
      };

      for (const validator of loginValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Please provide a valid email",
          }),
        ])
      );
    });

    it("should fail validation with missing password", async () => {
      req.body = {
        email: "test@example.com",
        password: "",
      };

      for (const validator of loginValidation) {
        await validator(req, res, next);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: "Password is required",
          }),
        ])
      );
    });
  });
});
