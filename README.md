# Task Management REST API

A REST API for a basic Task Management System. Users can register, log in and securely manage their own tasks, with search, filtering and pagination.

**Tech stack:** Node.js · Express.js · MongoDB (Mongoose) · JWT · bcrypt

---

## Features

- **Authentication** – register, login, JWT-based auth, bcrypt password hashing, get profile
- **Task CRUD** – create, list, view, update, delete (users only ever see their own tasks)
- **Task fields** – title, description, status, priority, due date, created date (`createdAt`)
- **Status** – `Pending` · `In Progress` · `Completed`
- **Priority** – `Low` · `Medium` · `High`
- **Search / filter / pagination** – search title & description, filter by status and priority, page & limit, optional sorting
- **Security & validation** – protected routes, ownership checks, request validation (express-validator), central error handling, field whitelisting, no password/stack leaks, Helmet, CORS, rate limiting on auth routes, JSON body size limit

---

## Project Structure

```
task-manager-api/
├── src/
│   ├── config/         # env loading & MongoDB connection
│   ├── controllers/    # request handlers (auth, task)
│   ├── middleware/     # auth (JWT), validation, error handling
│   ├── models/         # Mongoose schemas (User, Task)
│   ├── routes/         # Express routers
│   ├── utils/          # ApiError, asyncHandler, constants
│   ├── validators/     # express-validator rules
│   ├── app.js          # Express app (middleware + routes)
│   └── server.js       # entry point: connects DB and starts server
├── tests/              # Jest + Supertest integration tests
├── postman/            # Postman collection
├── .env.example
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB Atlas connection string

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/task-manager-api.git
cd task-manager-api
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable             | Description                                   | Example                                     |
| -------------------- | --------------------------------------------- | ------------------------------------------- |
| `NODE_ENV`           | `development` / `production`                  | `development`                               |
| `PORT`               | Port the server listens on                    | `5000`                                      |
| `MONGODB_URI`        | MongoDB connection string **(required)**      | `mongodb://127.0.0.1:27017/task_manager`    |
| `JWT_SECRET`         | Secret used to sign tokens **(required)**     | a long random string                        |
| `JWT_EXPIRES_IN`     | Token lifetime                                | `1d`                                        |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost factor                            | `10`                                        |
| `CORS_ORIGIN`        | Allowed origin                                | `*`                                         |

Generate a strong secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Run

```bash
npm run dev    # development (auto-reload with nodemon)
npm start      # production
```

The API is available at `http://localhost:5000`. Health check: `GET /api/health`.

### 4. Run tests

```bash
npm test
```

Tests use an in-memory MongoDB (`mongodb-memory-server`), so no running database is needed. The first run downloads a MongoDB binary.

---

## API Reference

All responses use a consistent shape:

```json
{ "success": true, "message": "...", "data": { ... } }
{ "success": false, "message": "Validation failed", "errors": [{ "field": "email", "message": "Email must be valid" }] }
```

Protected routes need the header `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint             | Auth | Description              |
| ------ | -------------------- | ---- | ------------------------ |
| POST   | `/api/auth/register` | No   | Register a new user      |
| POST   | `/api/auth/login`    | No   | Log in, returns a JWT    |
| GET    | `/api/auth/profile`  | Yes  | Get logged-in user       |

**Register** – `POST /api/auth/register`

```json
{ "name": "John Doe", "email": "john@example.com", "password": "secret123" }
```

Response `201`:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { "_id": "...", "name": "John Doe", "email": "john@example.com", "createdAt": "...", "updatedAt": "..." },
    "token": "eyJhbGciOi..."
  }
}
```

**Login** – `POST /api/auth/login`

```json
{ "email": "john@example.com", "password": "secret123" }
```

### Tasks (all require auth)

| Method | Endpoint          | Description                                    |
| ------ | ----------------- | ---------------------------------------------- |
| POST   | `/api/tasks`      | Create a task                                  |
| GET    | `/api/tasks`      | List own tasks (search, filter, paginate)      |
| GET    | `/api/tasks/:id`  | Get a single task                              |
| PUT    | `/api/tasks/:id`  | Update a task (any subset of fields)           |
| DELETE | `/api/tasks/:id`  | Delete a task                                  |

**Create** – `POST /api/tasks`

```json
{
  "title": "Finish backend assignment",
  "description": "Build the Task Management REST API",
  "status": "Pending",
  "priority": "High",
  "dueDate": "2026-12-31"
}
```

| Field         | Rules                                                        |
| ------------- | ------------------------------------------------------------ |
| `title`       | required, string, max 100 chars                              |
| `description` | optional, string, max 1000 chars                             |
| `status`      | optional, `Pending` \| `In Progress` \| `Completed` (default `Pending`) |
| `priority`    | optional, `Low` \| `Medium` \| `High` (default `Medium`)     |
| `dueDate`     | optional, ISO 8601 date (`null` clears it on update)         |

`createdAt` (Created Date) and `updatedAt` are set automatically.

**List** – `GET /api/tasks`

| Query param | Description                                       | Default     |
| ----------- | ------------------------------------------------- | ----------- |
| `search`    | Case-insensitive match on title or description    | –           |
| `status`    | `Pending`, `In Progress`, `Completed`             | –           |
| `priority`  | `Low`, `Medium`, `High`                           | –           |
| `page`      | Page number (≥ 1)                                 | `1`         |
| `limit`     | Items per page (1–100)                            | `10`        |
| `sortBy`    | `createdAt`, `updatedAt`, `dueDate`, `title`      | `createdAt` |
| `order`     | `asc` or `desc`                                   | `desc`      |

Example: `GET /api/tasks?status=Completed&page=1&limit=10`

```json
{
  "success": true,
  "data": {
    "tasks": [ { "_id": "...", "title": "...", "status": "Completed", "priority": "High", "dueDate": null, "user": "...", "createdAt": "...", "updatedAt": "..." } ],
    "pagination": { "total": 14, "page": 1, "limit": 10, "totalPages": 2, "hasNextPage": true, "hasPrevPage": false }
  }
}
```

### Status codes

| Code | Meaning                                              |
| ---- | ---------------------------------------------------- |
| 200  | OK                                                   |
| 201  | Created                                              |
| 400  | Validation error / invalid id / malformed JSON       |
| 401  | Missing, invalid or expired token; wrong credentials |
| 404  | Task not found (or belongs to another user) / unknown route |
| 409  | Email already registered                             |
| 429  | Too many auth requests                               |
| 500  | Internal server error (details are never exposed)    |

---

## Security Notes

- Passwords are hashed with bcrypt and excluded from every query (`select: false`) and every JSON response.
- Every task query is scoped to `req.user._id`; another user's task id returns `404`, so task existence isn't revealed.
- Only whitelisted fields (`title`, `description`, `status`, `priority`, `dueDate`) are written, so clients can't set `user` or `_id`.
- Search input is regex-escaped to prevent ReDoS / regex injection.
- Login returns the same message for unknown email and wrong password.
- Stack traces are only included for 5xx errors in `development`.

---

## Postman

Import `postman/Task-Management-API.postman_collection.json`.

1. Set the `baseUrl` collection variable (default `http://localhost:5000`).
2. Run **Auth → Register** (or **Login**). The token is saved to `{{token}}` automatically.
3. Run **Tasks → Create Task**. The new id is saved to `{{taskId}}`.
4. The other requests (list, filter, search, update, delete, error cases) work straight away.

---

## Deployment (optional)

Works on any Node host (Render, Railway, Fly.io, etc.):

1. Create a free MongoDB Atlas cluster and copy its connection string.
2. Create a new Web Service from this repo with build command `npm install` and start command `npm start`.
3. Add the environment variables from `.env.example` (set `NODE_ENV=production`).

Live URL: _add here after deploying_
