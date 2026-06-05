# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Asynqa is a cross-platform desktop application for developers who use the [asynq](https://github.com/hibiken/asynq) library in Go. It provides a visual interface to manage, monitor, and inspect asynq task queues backed by Redis. The app is built with **Wails v2** (Go backend + embedded web frontend) and is specifically designed for Go/asynq workflows — it is not a general-purpose Redis client.

## Tech Stack

- **Backend**: Go 1.25, Wails v2 (v2.12), GORM + SQLite
- **Frontend**: React 19, TypeScript, Vite 7, TanStack Router (file-based routing), TanStack Query
- **Styling**: Tailwind CSS v4, shadcn/ui (new-york style, zinc base color)
- **Build**: Wails CLI (`wails build`, `wails dev`), platform-specific assets in `build/`

## Commands

```bash
# Development (hot-reload for both frontend and backend)
wails dev

# Build for current OS
wails build

# Frontend only (from frontend/ directory)
npm run dev
npm run build
```

## Architecture

### Backend (Go)

- `main.go` — Wails v2 app entry point: initializes DB, binds services, configures window via `wails.Run()`
- `internal/domain/` — Domain models (e.g., `Environment` struct with GORM tags)
- `internal/services/` — Business logic services (`environment_service.go`, `dashboard_service.go`, `asynq_helper.go`)
- `infrastructure/database/` — SQLite setup (`sqlite.go`), migrations (`migrations.go`), custom GORM-slog logger adapter (`logger.go`)

Services are instantiated in `main.go` and passed to `options.App.Bind` to expose them to the frontend through Wails bindings.

### Frontend (React/TypeScript)

- `frontend/src/main.tsx` — App entry with router and query client setup
- `frontend/src/routes/` — TanStack Router file-based routes (auto-generates `routeTree.gen.ts`)
- `frontend/src/components/ui/` — shadcn/ui base components
- `frontend/src/components/environments/` — Environment management components
- `frontend/src/components/environment/` — Single environment view components
- `frontend/wailsjs/` — Auto-generated Wails v2 bindings (Go ↔ JS bridge). Do not edit manually.

### Wails Bindings

Backend Go methods are exposed to the frontend via auto-generated bindings in `frontend/wailsjs/`. After changing a bound service's exported methods, run `wails dev` or `wails build` to regenerate bindings.

### Database

SQLite database (`asynqa.db`) using GORM with auto-migration. Models are defined in `internal/domain/` and migrated in `infrastructure/database/`.

## Testing

Write tests for logic that can break in non-obvious ways — pure functions (sorting, pagination, parsing, formatting, mapping), edge cases, and bug fixes (add a test that reproduces the bug first). Prefer **TDD** when the logic is well-defined: write the failing test, then implement until it passes. Do **not** chase perfection or 100% coverage — skip tests for trivial glue, thin pass-through wrappers, generated code, and UI wiring that only a real run can validate. A few meaningful tests beat many shallow ones.

- **Go**: standard `testing` package, table-driven tests, files named `*_test.go` next to the code. Run with `go test ./...`. Keep units pure/injectable so they don't need a live Redis/DB.
- **Frontend**: Vitest (`cd frontend && npm run test`). Co-locate as `*.test.ts(x)` next to the unit. Test helpers and hooks logic, not styling.

## Key Conventions

- Path alias `@/*` maps to `frontend/src/*` in TypeScript imports
- shadcn/ui components are added via `npx shadcn@latest add <component>` (configured in `frontend/components.json`)
- Frontend assets are embedded into the Go binary via `go:embed all:frontend/dist`
- Structured logging uses Go's `slog` package with a custom GORM adapter
- Wails v2 configuration lives in `wails.json` at the project root

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
