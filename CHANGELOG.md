# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-05-21

### Added
- **Task Runner drafts:** in-progress edits are now persisted per saved request, so navigating away to inspect a queue or another task no longer loses your work. A "Draft" indicator appears next to saved requests with unsaved changes, and a **Discard** button clears the draft.
- **Loading skeletons** on every task table (pending, active, scheduled, retry, archived, completed) so the views show clear feedback while data loads instead of appearing momentarily empty.
- **Task Runner empty state** — when an environment has no saved requests, the sidebar now shows a friendly prompt with a **New Request** button instead of a blank area.

### Changed
- **Date sorting now applies to the whole dataset.** Sorting a task table by its date column (e.g. "Last failed") sorts across all matching tasks, not just the current page. Very large queues are sorted up to a capped limit, and the UI shows a notice when that cap is reached.
- **Pooled Redis connections.** Each environment now reuses a single asynq inspector across the frequent polling requests instead of opening a new connection every few seconds; the connection is rebuilt automatically when the environment's settings change.

### Fixed
- **Connection errors now show the real reason.** When connecting to an environment fails, the toast shows the actual backend message (e.g. `connection failed: dial tcp ...`) instead of a generic or empty error.
- Removed a duplicate date column on the **completed** tasks tab.
- The loading skeleton, previously invisible against the panel background, is now visible.

## [0.1.0] - 2026-04-25

### Added
- Windows installer (NSIS) now lets you choose between installing for **all users** (`Program Files`, requires elevation) or **current user only** (`%LOCALAPPDATA%\Programs`, no admin needed). Per-user installs make the in-app auto-updater work without UAC, since the binary lives in a writable location.
- Optional **Desktop Shortcut** component on the Windows installer (enabled by default, can be unchecked from the Components page).

### Changed
- The in-app updater no longer attempts an in-place binary swap. Clicking **update available** now opens the GitHub release page in the browser so the user can download and run the latest installer manually. The previous mechanism failed silently on admin / `Program Files` installs (the running process cannot overwrite its own `.exe` without UAC) and was already manual on macOS — the redirect makes the flow uniform across platforms.
- A larger **update available** indicator is now shown in the top-right of the Manage Environments screen, in addition to the compact one in the per-environment status bar.

### Fixed
- Long environment names and Redis hosts no longer overflow their containers. Affected views: environments landing list, sidebar environment switcher (header trigger and dropdown items), and saved requests in the Task Runner sidebar. Text truncates with an ellipsis and the full value is shown on hover via a native tooltip.

### Notes
- Upgrading from `v0.0.1`: download the `v0.1.0` installer from the GitHub release page and run it manually. All future updates work the same way — the **update available** button in the app links straight to the release page.

## [0.0.1] - Initial release

### Added
- Dashboard with aggregated real-time view of queues, tasks, and workers.
- Queue management: list, pause/unpause, and per-state task breakdown.
- Task Inspector: payload, retry info, run/archive/delete actions.
- Task Runner: compose and enqueue tasks with an integrated JSON editor (CodeMirror 6, syntax highlighting, prettify).
- Saved Requests: save, clone, and organize Task Runner requests (persisted in SQLite).
- Workers and Schedulers monitoring views.
- Redis Info: raw server info from the connected Redis instance.
- Environments: manage multiple Redis/asynq connections.
- Auto-Updater: checks GitHub Releases for new versions (via `creativeprojects/go-selfupdate`).

[Unreleased]: https://github.com/jorgelhd94/asynqa/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/jorgelhd94/asynqa/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/jorgelhd94/asynqa/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/jorgelhd94/asynqa/releases/tag/v0.0.1
