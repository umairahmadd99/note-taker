# Test Suite Documentation

This directory contains comprehensive unit and integration tests for the Note Taking API.

## Test Structure

```
tests/
├── setup.js                    # Jest setup configuration
├── helpers.js                  # Test utility functions
├── controllers/
│   ├── authController.test.js  # Auth controller tests
│   └── noteController.test.js  # Note controller tests
├── middleware/
│   ├── auth.test.js           # Authentication middleware tests
│   └── cache.test.js          # Cache middleware tests
├── services/
│   └── noteService.test.js    # Note service tests
├── utils/
│   └── jwt.test.js            # JWT utility tests
├── validators/
│   ├── authValidators.test.js # Auth validation tests
│   └── noteValidators.test.js  # Note validation tests
├── routes/
│   ├── authRoutes.test.js     # Auth route tests
│   └── noteRoutes.test.js      # Note route tests
└── integration/
    └── app.test.js            # Integration tests
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm test -- --watch
```

### Run tests with coverage

```bash
npm test -- --coverage
```

### Run a specific test file

```bash
npm test -- tests/controllers/authController.test.js
```

### Run tests matching a pattern

```bash
npm test -- --testNamePattern="should register a new user"
```

## Test Coverage

The test suite covers:

- **Controllers**: All controller methods with success and error cases
- **Services**: Business logic with optimistic locking, versioning, and sharing
- **Middleware**: Authentication and caching middleware
- **Validators**: Input validation for all endpoints
- **Utils**: JWT token generation and verification
- **Routes**: HTTP route handlers and integration tests

## Mocking Strategy

- **Database**: Sequelize models are mocked to avoid database dependencies
- **Redis**: Redis connections are mocked for cache tests
- **JWT**: JWT library is mocked for token generation tests
- **File Uploads**: Multer is mocked for attachment tests

## Test Utilities

The `helpers.js` file provides:

- `generateTestToken()` - Generate JWT tokens for testing
- `generateTestRefreshToken()` - Generate refresh tokens
- `createMockUser()` - Create mock user objects
- `createMockNote()` - Create mock note objects

## Writing New Tests

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names (e.g., "should create a note successfully")
3. Mock external dependencies (database, Redis, etc.)
4. Test both success and error cases
5. Use the helper functions from `helpers.js`

## Example Test

```javascript
describe("MyController", () => {
  it("should handle request successfully", async () => {
    // Arrange
    const req = { body: { data: "test" } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    // Act
    await myController.handler(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
```
