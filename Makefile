.DEFAULT_GOAL := help

IMAGE_TAG ?= local
BACKEND_IMAGE ?= redgal-backend
FRONTEND_IMAGE ?= redgal-frontend
PROD_ENV_FILE ?= .env.prod.example

.PHONY: help
help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "Available targets:\n"} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-22s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: ci
ci: backend-check frontend-check compose-config ## Run local backend, frontend, and compose checks

.PHONY: backend-check
backend-check: ## Format-check, test, and build the backend
	cd backend && test -z "$$(gofmt -l .)"
	cd backend && go test ./...
	cd backend && CGO_ENABLED=0 go build -o /tmp/rubedo-api ./cmd/api

.PHONY: frontend-check
frontend-check: ## Typecheck, test, and build the frontend
	npm --prefix frontend install
	npm --prefix frontend run typecheck
	npm --prefix frontend run test
	npm --prefix frontend run build

.PHONY: compose-config
compose-config: ## Validate local and production compose config
	docker compose -f docker-compose.yml config --quiet
	docker compose --env-file $(PROD_ENV_FILE) -f compose.prod.yml config --quiet

.PHONY: dev-up
dev-up: ## Start the local compose stack with rebuilt app images
	docker compose -f docker-compose.yml up -d --build

.PHONY: dev-down
dev-down: ## Stop the local compose stack
	docker compose -f docker-compose.yml down

.PHONY: docker-build
docker-build: docker-build-backend docker-build-frontend ## Build backend and frontend images locally

.PHONY: docker-build-backend
docker-build-backend: ## Build the backend image locally
	docker build -f backend/Dockerfile -t $(BACKEND_IMAGE):$(IMAGE_TAG) backend

.PHONY: docker-build-frontend
docker-build-frontend: ## Build the frontend image locally
	docker build -f frontend/Dockerfile -t $(FRONTEND_IMAGE):$(IMAGE_TAG) frontend
