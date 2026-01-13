# Note Taking API

A comprehensive Note Taking API built with ExpressJS, MySQL, Redis, and Sequelize ORM. This application demonstrates expertise in modern JavaScript, database design, caching strategies, Docker containerization, and design patterns.

## Features

### Core Requirements

- ✅ **Versioning System**: Track changes to notes over time and revert to previous versions
- ✅ **Concurrency Handling**: Optimistic locking to prevent concurrent updates
- ✅ **Full-Text Search**: Efficient keyword-based search using MySQL FULLTEXT indexes
- ✅ **User Authentication**: Secure registration and login with JWT tokens
- ✅ **Note CRUD Operations**: Create, read, update, and soft delete notes
- ✅ **Redis Caching**: Cache frequently accessed endpoints with invalidation strategies
- ✅ **Soft Deletion**: Preserve note history with soft delete functionality
- ✅ **Singleton Pattern**: Applied to database and Redis connections

### Bonus Features

- ✅ **Note Sharing**: Share notes with other users with read/edit permissions
- ✅ **Multimedia Attachments**: Attach images and videos to notes
- ✅ **Refresh Token Mechanism**: Enhanced session management with refresh tokens
- ✅ **Comprehensive Test Suite**: Unit tests, integration tests, and route tests with Jest

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **ORM**: Sequelize
- **Cache**: Redis 7
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- npm or yarn

## Quick Start with Docker

1. **Clone the repository**

   ```bash
   git clone https://github.com/umairahmadd99/note-taker.git
   cd respondio
   ```

2. **Create environment file**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` if needed (defaults work for Docker setup)

3. **Start the application**

   ```bash
   docker-compose up --build
   ```

   This will:
   - Build the application container
   - Start MySQL and Redis containers
   - Run database migrations
   - Start the API server on port 3000

4. **Verify the setup**
   ```bash
   curl http://localhost:3000/health
   ```

## Local Development Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your local database and Redis configurations.

3. **Start MySQL and Redis**
   - MySQL: Ensure MySQL is running on port 3306
   - Redis: Ensure Redis is running on port 6379

4. **Run migrations**

   ```bash
   npm run migrate
   ```

5. **Start the server**
   ```bash
   npm run dev  # Development mode with nodemon
   # or
   npm start    # Production mode
   ```

## API Endpoints

### Authentication

#### Register User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Refresh Token

```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Notes

All note endpoints require authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <accessToken>
```

#### Create Note

```http
POST /api/v1/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My First Note",
  "content": "This is the content of my note"
}
```

#### Get All Notes

```http
GET /api/v1/notes
Authorization: Bearer <token>
```

#### Get Note by ID

```http
GET /api/v1/notes/:id
Authorization: Bearer <token>
```

#### Search Notes by Keywords

```http
GET /api/v1/notes/search?keywords=term
Authorization: Bearer <token>
```

#### Update Note

```http
PUT /api/v1/notes/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content",
  "version": 1
}
```

**Note:** The `version` field is required for optimistic locking. Use the current version number from the note.

#### Delete Note (Soft Delete)

```http
DELETE /api/v1/notes/:id
Authorization: Bearer <token>
```

#### Revert to Previous Version

```http
POST /api/v1/notes/:id/revert
Authorization: Bearer <token>
Content-Type: application/json

{
  "version": 2
}
```

#### Share Note

```http
POST /api/v1/notes/:id/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "sharedWithUserId": 2,
  "permission": "edit"
}
```

**Permissions:** `read` or `edit`

#### Add Attachment

```http
POST /api/v1/notes/:id/attachments
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
```

**Supported file types:** Images (JPEG, PNG, GIF, WebP) and Videos (MP4, MPEG, QuickTime)
**Max file size:** 10MB (configurable via `MAX_FILE_SIZE`)

## Testing

### Running Tests

The project includes a comprehensive test suite covering unit tests, integration tests, and route tests.

**Run all tests:**

```bash
npm test
```

**Run tests in watch mode:**

```bash
npm test -- --watch
```

**Run tests with coverage:**

```bash
npm test -- --coverage
```

**Run a specific test file:**

```bash
npm test -- tests/controllers/authController.test.js
```

The test suite covers:

- Controllers (auth and notes)
- Services (business logic)
- Middleware (authentication and caching)
- Validators (input validation)
- Utils (JWT utilities)
- Routes (API endpoints)
- Integration tests

For more details, see the [tests/README.md](tests/README.md) file.

### Testing the API Manually

#### Using cURL

1. **Register a user:**

   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
   ```

2. **Login:**

   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

3. **Create a note:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/notes \
     -H "Authorization: Bearer <your-token>" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Note","content":"This is a test note"}'
   ```

#### Using Postman

Import the API collection (if available) or manually test endpoints using the examples above.

## Database Schema

### Users Table

- `id` (INTEGER, Primary Key)
- `username` (STRING, Unique)
- `email` (STRING, Unique)
- `password` (STRING, Hashed)
- `createdAt`, `updatedAt` (TIMESTAMP)

### Notes Table

- `id` (INTEGER, Primary Key)
- `userId` (INTEGER, Foreign Key → users.id)
- `title` (STRING)
- `content` (TEXT)
- `version` (INTEGER)
- `deletedAt` (DATE, for soft deletion)
- `createdAt`, `updatedAt` (TIMESTAMP)
- **Full-Text Index** on `title` and `content`

### Note Versions Table

- `id` (INTEGER, Primary Key)
- `noteId` (INTEGER, Foreign Key → notes.id)
- `title` (STRING)
- `content` (TEXT)
- `version` (INTEGER)
- `changedBy` (INTEGER, Foreign Key → users.id)
- `createdAt`, `updatedAt` (TIMESTAMP)

### Note Shares Table

- `id` (INTEGER, Primary Key)
- `noteId` (INTEGER, Foreign Key → notes.id)
- `sharedWithUserId` (INTEGER, Foreign Key → users.id)
- `permission` (ENUM: 'read', 'edit')
- `createdAt`, `updatedAt` (TIMESTAMP)
- **Unique Index** on (`noteId`, `sharedWithUserId`)

### Note Attachments Table

- `id` (INTEGER, Primary Key)
- `noteId` (INTEGER, Foreign Key → notes.id)
- `filename` (STRING)
- `originalFilename` (STRING)
- `mimeType` (STRING)
- `fileSize` (INTEGER)
- `filePath` (STRING)
- `createdAt`, `updatedAt` (TIMESTAMP)

## Configuration

### Environment Variables

| Variable                 | Description             | Default         |
| ------------------------ | ----------------------- | --------------- |
| `PORT`                   | Server port             | 3000            |
| `NODE_ENV`               | Environment             | development     |
| `DB_HOST`                | MySQL host              | mysql           |
| `DB_PORT`                | MySQL port              | 3306            |
| `DB_NAME`                | Database name           | note_taking_db  |
| `DB_USER`                | Database user           | root            |
| `DB_PASSWORD`            | Database password       | rootpassword    |
| `REDIS_HOST`             | Redis host              | redis           |
| `REDIS_PORT`             | Redis port              | 6379            |
| `JWT_SECRET`             | JWT secret key          | (required)      |
| `JWT_REFRESH_SECRET`     | Refresh token secret    | (required)      |
| `JWT_EXPIRES_IN`         | Access token expiry     | 1h              |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry    | 7d              |
| `MAX_FILE_SIZE`          | Max upload size (bytes) | 10485760 (10MB) |
| `UPLOAD_DIR`             | Upload directory        | uploads         |

## Design Patterns

### Singleton Pattern

Applied to:

- **DatabaseConnection**: Ensures a single Sequelize instance
- **RedisConnection**: Ensures a single Redis client instance

Both connections are initialized once and reused throughout the application lifecycle.

## Caching Strategy

- **Cached Endpoints:**
  - `GET /api/v1/notes` (5 minutes TTL)
  - `GET /api/v1/notes/:id` (5 minutes TTL)
  - `GET /api/v1/notes/search` (5 minutes TTL)

- **Cache Invalidation:**
  - On note creation
  - On note update
  - On note deletion
  - On note sharing

Cache keys follow the pattern: `cache:<endpoint>:<userId>`

## Concurrency Handling

The application uses **Optimistic Locking** to handle concurrent updates:

1. Each note has a `version` field
2. When updating, the client must provide the current version
3. If the version doesn't match, the update is rejected with a 409 Conflict error
4. The client must refresh the note and retry with the new version

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `404` - Not Found
- `409` - Conflict (concurrency conflict)
- `500` - Internal Server Error

## Security Features

- Password hashing with bcrypt (salt rounds: 10)
- JWT-based authentication
- Helmet.js for security headers
- Rate limiting (100 requests per 15 minutes per IP)
- Input validation with express-validator
- SQL injection protection via Sequelize ORM
- File type validation for uploads

## Project Structure

```
note-taker/
├── config/
│   └── database.js          # Sequelize configuration
├── src/
│   ├── config/
│   │   ├── database.js      # Database singleton
│   │   └── redis.js         # Redis singleton
│   ├── controllers/
│   │   ├── authController.js
│   │   └── noteController.js
│   ├── middleware/
│   │   ├── auth.js          # Authentication middleware
│   │   └── cache.js         # Caching middleware
│   ├── migrations/          # Database migrations
│   ├── models/              # Sequelize models
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── noteRoutes.js
│   │   └── index.js
│   ├── services/
│   │   └── noteService.js   # Business logic
│   ├── utils/
│   │   └── jwt.js           # JWT utilities
│   ├── validators/          # Input validation
│   └── server.js            # Application entry point
├── tests/                   # Test suite
│   ├── controllers/         # Controller tests
│   ├── services/            # Service tests
│   ├── middleware/          # Middleware tests
│   ├── validators/          # Validator tests
│   ├── utils/               # Utility tests
│   ├── routes/              # Route tests
│   ├── integration/         # Integration tests
│   └── README.md            # Test documentation
├── uploads/                 # File uploads directory
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

## Troubleshooting

### Database Connection Issues

- Ensure MySQL is running and accessible
- Check database credentials in `.env`
- Verify network connectivity in Docker setup

### Redis Connection Issues

- Ensure Redis is running and accessible
- Check Redis host and port in `.env`
- The application will continue without caching if Redis is unavailable

### Migration Issues

- Run migrations manually: `npm run migrate`
- Check database permissions
- Ensure database exists

## License

ISC
