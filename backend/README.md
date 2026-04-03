# Rubedo Backend Scaffold

This directory contains a compileable backend scaffold derived from `docs/requirement.md`.

## Stack Targets

- Go 1.24
- Gin for HTTP routing
- PostgreSQL for primary data storage
- Redis for cache and rate limiting
- RabbitMQ for async jobs
- Meilisearch for search indexing

## Current Scope

The scaffold intentionally focuses on structure instead of full business logic:

- config loading
- HTTP bootstrap and graceful shutdown
- request ID, auth, and rate-limit middleware placeholders
- domain modules for auth, user, article, forum, wall, and Luckybot
- infrastructure placeholders for PostgreSQL, Redis, RabbitMQ, and Meilisearch

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
- `POST /api/v1/luckybot/chat`
- `POST /api/v1/admin/luckybot/reload`

## Start

```bash
go mod tidy
go run ./cmd/api
```

Use `.env.example` as the base environment file. The service can start without external middleware dependencies connected yet; those are intentionally left as next-step integrations.
