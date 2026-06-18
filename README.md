# Redgal Forum / Rubedo

Redgal Forum 是一个面向视觉小说社群的论坛与内容门户项目。当前代码库包含前端单页应用、Go 后端 API、PostgreSQL 数据库 schema，以及 Docker Compose 本地/生产部署配置。

## 功能范围

- 门户首页、活动入口与站点内容配置
- 专栏文章浏览、发布、编辑与管理删除
- 普通论坛、匿名讨论版、回复、点赞、收藏与签到成长体系
- 用户注册、登录、个人空间、好友与认证审核
- Bangumi 收藏导入与同步任务追踪
- 展示墙投稿、审核与图库内容管理
- 管理后台，包括用户、内容、活动、展示墙与论坛可用性设置
- Swagger/OpenAPI 接口说明页

## 技术栈

### Frontend

- React 19
- TypeScript
- Vite
- Mantine
- Tailwind CSS
- Motion
- Three.js / React Three Fiber

### Backend

- Go 1.25
- Gin
- PostgreSQL 17
- Redis 7
- Meilisearch 1.13

### Deployment

- Docker Compose
- Nginx frontend container
- Backend container with healthcheck
- Root-level `.env` as canonical environment file

## 目录结构

```text
.
├── DB/                         # PostgreSQL schema, migrations, database design docs
├── backend/                    # Go API service
│   ├── cmd/api/                # Backend entrypoint
│   └── internal/               # Modules, router, middleware, platform clients
├── frontend/                   # React/Vite frontend
│   ├── src/api/                # API client wrappers
│   ├── src/components/         # Shared UI components
│   ├── src/pages/              # Page-level views
│   └── src/styles/             # Theme, page, component CSS
├── docs/                       # Run guides and implementation reports
├── public/                     # Shared static assets
├── scripts/                    # Utility and regression scripts
├── docker-compose.yml          # Local full-stack compose
├── compose.prod.yml            # Production compose
├── .env.example                # Development env template
└── .env.prod.example           # Production env template
```

## Quick Start

### 1. Start the full stack with Docker

```bash
cp .env.example .env
docker compose -f docker-compose.yml up -d --build
```

Default local service URLs:

- Frontend: `http://127.0.0.1:8081`
- Backend API: `http://127.0.0.1:8080/api/v1`
- Swagger UI: `http://127.0.0.1:8080/swagger/`
- OpenAPI JSON: `http://127.0.0.1:8080/swagger/openapi.json`
- PostgreSQL host port: `5433`
- Redis host port: `6380`
- Meilisearch host port: `7701`

Health checks:

```bash
docker compose -f docker-compose.yml ps
curl -fsS http://127.0.0.1:${BACKEND_PORT:-8080}/api/v1/health
```

### 2. Run frontend and backend manually

Start infrastructure only, or use your own PostgreSQL/Redis/Meilisearch instances:

```bash
cp .env.example .env
docker compose -f docker-compose.yml up -d postgres redis meilisearch
```

Backend:

```bash
cd backend
go mod download
go run ./cmd/api
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Vite defaults to `http://localhost:5173`. If the port is already in use, Vite will choose the next free port.

## Environment

Use `.env.example` for local development:

```bash
cp .env.example .env
```

Important variables:

- `APP_ENV`: `development` or `production`
- `HTTP_PORT`: backend listen port for direct runs
- `AUTH_JWT_SECRET`: token signing secret
- `AUTH_ALLOW_DEBUG_HEADERS`: enables debug auth headers in development
- `AUTH_ALLOW_SCAFFOLD_LOGIN`: enables scaffold login fallback in development
- `POSTGRES_DSN`: backend direct-run PostgreSQL DSN
- `REDIS_ADDR`: backend direct-run Redis address
- `MEILISEARCH_URL`: backend direct-run Meilisearch URL
- `BANGUMI_API_BASE_URL`: optional Bangumi API override
- `BANGUMI_API_USER_AGENT`: required by polite Bangumi API usage

For production, start from:

```bash
cp .env.prod.example .env
```

Set strong values for `AUTH_JWT_SECRET`, `POSTGRES_PASSWORD`, and `MEILISEARCH_MASTER_KEY`.

## Common Commands

Backend:

```bash
cd backend
go test ./...
go run ./cmd/api
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run test
npm run build
npm run dev
```

Full-stack compose:

```bash
docker compose -f docker-compose.yml up -d --build
docker compose -f docker-compose.yml logs -f backend
docker compose -f docker-compose.yml down
```

Route regression smoke test:

```bash
BASE_URL=http://127.0.0.1:8080/api/v1 ./scripts/backend-route-regression.sh
```

Optional super-admin route check:

```bash
SUPER_ADMIN_ACCOUNT=<account> \
SUPER_ADMIN_PASSWORD=<password> \
BASE_URL=http://127.0.0.1:8080/api/v1 \
./scripts/backend-route-regression.sh
```

## CI/CD

This repository includes GitHub Actions workflows under `.github/workflows/`.

### Local Developer Commands

Common local commands are wrapped in the root `Makefile`:

```bash
make ci
make dev-up
make dev-down
make docker-build
make docker-build-backend IMAGE_TAG=dev
make docker-build-frontend IMAGE_TAG=dev
```

### Development CI

Workflow: `.github/workflows/ci.yml`

Triggers:

- Push to `main`, `master`, or `develop`
- Pull requests
- Manual `workflow_dispatch`

Checks:

- Backend dependency download, `gofmt` check, `go test ./...`, and API binary build
- Frontend `npm ci`, `npm run typecheck`, `npm run test`, and `npm run build`
- Docker Compose config validation for local and production compose files

### Docker Image Build

Workflow: `.github/workflows/docker-images.yml`

Triggers:

- Pull requests: build images without pushing
- Push to `main` or `master`: build and push images
- Tags matching `v*`: build and push versioned images
- Manual `workflow_dispatch`: choose whether to push images

Images are published to GitHub Container Registry:

```text
ghcr.io/<github-owner>/redgal-backend
ghcr.io/<github-owner>/redgal-frontend
```

The workflow emits these tag styles:

- Branch tag, for example `main`
- Git tag, for example `v1.0.0`
- SHA tag, for example `sha-<commit>`
- `latest` on the default branch

To use GHCR images with compose:

```bash
BACKEND_IMAGE=ghcr.io/<github-owner>/redgal-backend:latest
FRONTEND_IMAGE=ghcr.io/<github-owner>/redgal-frontend:latest
docker compose -f docker-compose.yml up -d
```

## API Documentation

After starting the backend:

- Swagger UI: `http://127.0.0.1:8080/swagger/`
- OpenAPI JSON: `http://127.0.0.1:8080/swagger/openapi.json`
- Health endpoint: `GET /api/v1/health`

The API uses a shared response envelope:

```json
{
  "ok": true,
  "request_id": "request-id",
  "data": {}
}
```

Error responses use:

```json
{
  "ok": false,
  "request_id": "request-id",
  "error": "message"
}
```

## Production Deployment

Build or pull production images:

```bash
docker compose --env-file .env -f compose.prod.yml pull
docker compose --env-file .env -f compose.prod.yml up -d
```

To build from local source instead of using remote images:

```bash
docker compose --env-file .env -f compose.prod.yml build frontend backend
docker compose --env-file .env -f compose.prod.yml up -d
```

`compose.prod.yml` exposes only the frontend through `WEB_PORT`; backend, PostgreSQL, Redis, and Meilisearch stay on the internal Docker network.

## Database

The initial schema is mounted into PostgreSQL from:

```text
DB/schema.sql
```

Additional migrations live in:

```text
DB/migrations/
```

For a fresh local compose volume, `DB/schema.sql` is applied automatically by the PostgreSQL image. If a database volume already exists, schema changes need explicit migrations.

## Development Notes

- Root `.env` is the canonical env file. The backend still falls back to `backend/.env` for compatibility.
- The frontend dev server proxies `/api` to `VITE_PROXY_TARGET`, defaulting to `http://127.0.0.1:8081`.
- In Docker Compose local mode, frontend is exposed on `FRONTEND_PORT` and backend on `BACKEND_PORT`.
- Keep unrelated working-tree changes intact; this repository may have active UI and backend work in progress.
