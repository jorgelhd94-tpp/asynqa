<!--
SYNC IMPACT REPORT
Version change: (template / unversioned) → 1.0.0
Bump rationale: Initial ratification — placeholder template replaced with the
project's concrete, governing principles. MAJOR (first defined version).

Principles defined (7):
  I.   Asynq-First Scope
  II.  Backend Purity & Testable Units
  III. Pragmatic Test-First
  IV.  Secure Credential Handling
  V.   Cross-Platform Parity
  VI.  UI Consistency & Reuse
  VII. Structured Observability

Added sections:
  - Technology Constraints
  - Development Workflow & Release Discipline
  - Governance

Removed sections: none (template placeholders fully replaced).

Templates / artifacts reviewed for alignment:
  ✅ .specify/templates/plan-template.md — "Constitution Check" gate is dynamic
       (reads this file at runtime); no edit required.
  ✅ .specify/templates/spec-template.md — generic, no constitution conflict.
  ✅ .specify/templates/tasks-template.md — "Tests OPTIONAL" wording is compatible
       with Principle III (tests required only for non-obvious logic); no edit required.
  ✅ CLAUDE.md — testing/observability/stack guidance consistent with this constitution.

Deferred TODOs: none.
-->

# AsynQA Constitution

AsynQA is a cross-platform desktop application that gives Go developers a visual
interface to manage, monitor, and inspect [asynq](https://github.com/hibiken/asynq)
task queues backed by Redis. It is built with Wails v2 (Go backend + embedded React
frontend). This constitution defines the non-negotiable principles that govern how
the project is designed, built, tested, and released.

## Core Principles

### I. Asynq-First Scope

AsynQA exists to serve Go/asynq workflows — nothing more. Every feature MUST map to a
concrete asynq concept (queues, tasks, workers, schedulers, retries, payloads, server
info) or to managing the connection environments that reach them.

- The app MUST NOT drift into a general-purpose Redis client or admin tool. Raw Redis
  surface is exposed only where it directly supports an asynq workflow.
- New capabilities MUST be expressible in asynq's domain vocabulary before they are
  built. If a request cannot be framed in asynq terms, it is out of scope.

**Rationale**: A sharp product boundary keeps the UX focused for its actual audience
and prevents the maintenance burden of a generic Redis GUI.

### II. Backend Purity & Testable Units

Business logic in the Go backend MUST be written so it can be tested without a live
Redis or database.

- Services MUST receive their dependencies (inspectors, connections, clocks, stores)
  via injection rather than constructing them internally, so units are exercised with
  fakes/stubs.
- Pure logic — sorting, pagination, parsing, formatting, mapping, aggregation — MUST be
  separable from I/O and callable in isolation.
- A unit test MUST NOT require a running Redis/SQLite to pass. Integration or live
  smoke tests that do require them MUST be clearly separated and not gate fast unit runs.

**Rationale**: Injectable, I/O-free units are the foundation that makes Principle III
practical and keeps the test suite fast and deterministic.

### III. Pragmatic Test-First

Tests are written for logic that can break in non-obvious ways; perfection and 100%
coverage are explicit non-goals.

- Pure functions and non-obvious logic (sorting, pagination, parsing, formatting,
  mapping, edge cases) MUST have tests. When the logic is well-defined, TDD is the
  default: write the failing test first, then implement until it passes.
- Bug fixes MUST start with a test that reproduces the bug before the fix is applied.
- Tests SHOULD be skipped for trivial glue, thin pass-through wrappers, generated code,
  and UI wiring that only a real run can validate.
- Go uses table-driven tests in `*_test.go` next to the code (`go test ./...`).
  Frontend uses Vitest co-located as `*.test.ts(x)` (`cd frontend && npm run test`).

**Rationale**: A few meaningful tests on fragile logic catch real regressions; shallow
tests on glue cost maintenance without buying confidence.

### IV. Secure Credential Handling

Redis connection details are sensitive and MUST be handled as such.

- Credentials (passwords, connection strings, auth tokens) MUST NOT be written to logs,
  error messages surfaced to the UI, the CHANGELOG, commits, or any other artifact.
- Connection errors reported to the user MUST describe the failure without leaking the
  secret that caused it.
- Stored environment data lives only in the local SQLite database on the user's machine;
  it MUST NOT be transmitted anywhere except the Redis server the user explicitly targets.

**Rationale**: The app holds the keys to users' production task queues; a single leaked
credential in a log or screenshot is a real breach.

### V. Cross-Platform Parity

AsynQA MUST work on Windows, Linux, and macOS.

- A change MUST NOT rely on platform-specific behavior (path separators, line endings,
  shell, filesystem casing) without a working path for the other supported platforms.
- Platform-specific code MUST be isolated and have a defined behavior on every supported
  OS — never an unhandled break on the platforms the author did not test.
- Build/release tooling MUST keep producing artifacts for all three platforms.

**Rationale**: The product promise is "cross-platform desktop app"; a feature that only
runs on the author's OS silently breaks that promise for part of the user base.

### VI. UI Consistency & Reuse

The frontend MUST present one coherent interface and avoid duplicated UI logic.

- New UI MUST use shadcn/ui (new-york style, zinc base) and existing Tailwind v4
  conventions rather than introducing parallel component systems.
- Before building a new component, the author MUST check for an existing shared component
  (e.g. shared tables, skeletons, query hooks) and extend/reuse it instead of duplicating.
- Server state MUST go through TanStack Query hooks; routing MUST use the file-based
  TanStack Router. Wails bindings in `frontend/wailsjs/` are generated and MUST NOT be
  edited by hand — regenerate via `wails dev`/`wails build` after backend method changes.

**Rationale**: Reuse keeps the UI consistent, shrinks the surface area for bugs, and was
already paying off (shared TaskTable, skeletons) — codifying it prevents regression to
copy-paste components.

### VII. Structured Observability

The backend MUST be debuggable through structured logs, not stray output.

- Backend logging MUST use Go's `slog` (including the custom GORM-slog adapter); ad-hoc
  `fmt.Print*` for diagnostics is prohibited in committed code.
- Log records SHOULD carry structured context (queue, environment, operation) so failures
  can be traced — while respecting Principle IV (never log secrets).
- User-facing errors MUST be actionable and legible; Wails bindings reject with a plain
  string (not an Error), so the frontend MUST extract the message via the shared helper.

**Rationale**: A queue-management tool is only trustworthy if its own failures are
diagnosable; consistent structured logging is what makes that possible.

## Technology Constraints

The stack is fixed and changes to it are governance-level decisions (see below):

- **Backend**: Go 1.25, Wails v2 (v2.12), GORM + SQLite. Entry point `main.go` binds
  services via `options.App.Bind`. Domain models in `internal/domain/`, services in
  `internal/<domain>/`, infrastructure (DB, migrations, logger) in `infrastructure/`.
- **Frontend**: React 19, TypeScript, Vite 7, TanStack Router (file-based) + TanStack
  Query, Tailwind CSS v4, shadcn/ui. Path alias `@/*` → `frontend/src/*`. Frontend assets
  are embedded into the Go binary via `go:embed all:frontend/dist`.
- **Build**: Wails CLI (`wails dev`, `wails build`); configuration in `wails.json`.
- Adding a major dependency or framework MUST be justified against these constraints in
  the plan's Complexity Tracking; "it's cleaner" is not sufficient justification.

## Development Workflow & Release Discipline

- **Spec-driven flow**: Substantial features follow the Spec Kit cycle
  (constitution → specify → clarify → plan → tasks → analyze → implement). The
  Constitution Check gate in planning MUST pass before design proceeds; violations go in
  the plan's Complexity Tracking table with justification.
- **Semantic versioning**: Releases follow SemVer (`MAJOR.MINOR.PATCH`). Backward-
  incompatible changes bump MAJOR, new backward-compatible features bump MINOR, fixes
  bump PATCH. `wails.json` `productVersion` and `frontend/package.json` MUST stay in sync.
- **CHANGELOG**: Every release MUST update `CHANGELOG.md` with the user-facing changes for
  that version before the release is tagged.
- **Branching**: Feature work branches off `develop`; release work uses `release/x.y.z`;
  `main` is the default/stable branch.
- **Reviews**: Changes SHOULD be reviewed against these principles before merge; the
  testing and security principles (III, IV) are blocking gates, not suggestions.

## Governance

This constitution supersedes ad-hoc practice. When guidance here conflicts with a habit,
a comment, or convenience, this document wins.

- **Amendments**: Changes to this constitution are made by the maintainer and committed
  with a clear rationale. Each amendment updates the version and the Last Amended date and
  refreshes the Sync Impact Report at the top of this file.
- **Versioning policy** (of this constitution): MAJOR for backward-incompatible principle
  removals or redefinitions; MINOR for a new principle/section or materially expanded
  guidance; PATCH for clarifications and wording fixes.
- **Compliance**: Plans, specs, and task lists MUST stay consistent with the principles
  above. Justified, documented exceptions are allowed (Complexity Tracking); silent
  deviations are not. `CLAUDE.md` provides the runtime, agent-facing companion guidance
  and MUST remain consistent with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-06-05 | **Last Amended**: 2026-06-05
