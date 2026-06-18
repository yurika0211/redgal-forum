# Rubedo Backend Scaffold

This directory contains a compileable backend scaffold derived from `docs/requirement.md`.

## Stack Targets

- Go 1.24
- Gin for HTTP routing
- PostgreSQL for primary data storage
- Redis for cache and rate limiting
- Meilisearch for search indexing

## Current Scope

The scaffold intentionally focuses on structure instead of full business logic:

- config loading
- HTTP bootstrap and graceful shutdown
- request ID, auth, and rate-limit middleware placeholders
- domain modules for auth, user, article, forum, wall, activity, and site content
- infrastructure placeholders for PostgreSQL, Redis, and Meilisearch

## Routes Reserved

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `POST /api/v1/users/me/bangumi/import`
- `GET /api/v1/users/:username`
- `GET /api/v1/articles`
- `POST /api/v1/articles`
- `GET /api/v1/articles/:articleID`
- `PATCH /api/v1/articles/:articleID`
- `GET /api/v1/forum/threads`
- `POST /api/v1/forum/threads`
- `GET /api/v1/forum/threads/:threadID`
- `POST /api/v1/forum/threads/:threadID/replies`
- `GET /api/v1/wall`
- `POST /api/v1/wall/submissions`
- `POST /api/v1/wall/submissions/:submissionID/review`

## Start

```bash
go mod tidy
# from repo root:
# cp .env.example .env
# from backend dir (legacy):
# cp .env.example .env
go run ./cmd/api
```

Use the project root `.env.example` as the canonical base environment file.
Backend startup now loads root `.env` first and then falls back to `backend/.env` for compatibility.
The service can start without external middleware dependencies connected yet; those are intentionally left as next-step integrations.

## API Docs

After starting the backend, open the Swagger page at:

- `http://127.0.0.1:8080/swagger/`

The OpenAPI JSON is available at:

- `http://127.0.0.1:8080/swagger/openapi.json`
