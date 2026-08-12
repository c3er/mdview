# AGENTS.md

## Mission

This repository is the legacy application that defines the user-visible behavior of Markdown Viewer. It is the ground truth for feature behavior and bugfix expectations. The code is older and more monolithic than the refactored successor, but its behavior is the standard to preserve.

This file exists as guidance for AI-assisted maintenance and small feature work. It is intentionally conservative: do not rewrite the app; do targeted bugfixes and incremental improvements.

## Working style for this repo

- Treat the app as a stable, production-style tool, not a sandbox for large refactors.
- Prefer surgical fixes over architecture churn.
- Keep compatibility with Windows, macOS, and Linux behaviors.
- If you change behavior, update the relevant tests or add a focused regression test.
- Preserve the original UX and the minimal-scope character of the project.

## Architecture overview

This repo is not as cleanly layered as the refactor, but the main responsibilities are still recognizable:

### 1. Main process lifecycle

- `app/main.js`: main window lifecycle, menu setup, file opening, settings, navigation, reload handling, and OS integration.
- `app/lib/cliMain.js`: startup and CLI logic.
- `app/lib/menuMain.js`: menus and menu-state toggling.
- `app/lib/navigationMain.js`: current file path, history/back-forward navigation, and cross-location callbacks.
- `app/lib/windowManagementMain.js`: BrowserWindow lifecycle and instance tracking.

The main process is responsible for app-level state and OS integration.

### 2. Renderer startup

- `app/index.js`: renderer bootstrap, which initializes the document UI and the relevant subsystems.
- `app/lib/commonRenderer.js`, `settingsRenderer.js`, `searchRenderer.js`, `navigationRenderer.js`, `tocRenderer.js`, `rawTextRenderer.js`, `aboutRenderer.js`, `questionRenderer.js`:
  - these modules build the live view and user interactions
  - the renderer owns DOM logic and document presentation

The architecture is more coupled than the refactor, but the UI behavior remains centered around document rendering and the DOM.

### 3. Rendering and document behavior

- `app/lib/documentRenderingRenderer.js`: central Markdown rendering logic, local-path rewriting, relative media resolution, anchors, and syntax highlighting.
- `app/lib/contentBlockingMain.js` / `contentBlockingRenderer.js`: selective blocking of remote content.
- `app/lib/tocMain.js` / `tocRenderer.js`: document table of contents and navigation.
- `app/lib/searchMain.js` / `searchRenderer.js`: search UI and term highlighting.

A large amount of functional correctness lives in the renderer and document pipeline.

### 4. Settings and persistence

- `app/lib/storageMain.js`: JSON-backed app settings and document settings.
- `app/lib/settingsMain.js`: settings application and synchronization.
- `app/lib/fileHistoryMain.js`: recent-file tracking.

This repo stores settings in a straightforward way. For fixes, be careful not to break serialized schema compatibility or default values.

### 5. IPC and shared contracts

- `app/lib/ipcMain.js`, `app/lib/ipcRenderer.js`, `app/lib/ipcShared.js`

This app uses explicit message names, and many features rely on keeping those contracts stable. When fixing or adding a behavior, check whether it is routed through an existing IPC message or if a tiny extension is needed.

## Implementation philosophy visible in the Git history

The Git history here is strongly issue-driven and bugfix-oriented. The project’s pattern is not “large architecture moves”; it is “understand the bug, patch the exact point of failure, preserve behavior, and ship.”

Examples from the recent history:

- “Fix handling of the escape key in the search dialog”
- “Fix decoding of url encoded relative paths”
- “Fix character escaping for Mermaid diagrams”
- “Fix file open behavior under macOS”
- “Log errors instead of silently catching all”
- “Log entire error object instead of just message property”
- “Fix path handling bugfix”

This points to a consistent philosophy:

- be conservative
- favor correctness over elegance
- resolve the actual issue without broad refactors
- keep platform-specific bugs under control
- preserve URLs, encoding, and relative-file behavior exactly

The history also shows that local navigation, path handling, and Markdown rendering are the most sensitive areas. If you are working in the legacy app, these are the places that need the most caution.

## Safe change patterns

When working in this repo, prefer these approaches:

1. Reproduce the issue with a small targeted test if possible.
2. Inspect the feature’s local module rather than touching unrelated subsystems.
3. Fix the root cause in that module.
4. Keep the message contract stable unless there is a clearly needed extension.
5. Validate behavior against real app flows such as file open, search, relative links, and reload.

## Feature addition guidance

The legacy repo still accepts bugfixes and small improvements, but not wholesale new architecture. If you add functionality:

- scope it narrowly
- mimic the existing app patterns
- keep the feature simple and user-facing
- avoid introducing large abstractions or infrastructure that do not yet exist

This is a maintenance-first repo. If a feature needs major apparatus, it likely belongs in the refactor instead of here.

## Areas that historically require special care

- path handling and URL decoding
- macOS file open behavior
- Mermaid rendering and escaping
- document-local links and relative assets
- search dialog keyboard behavior
- error logging and silent failures
- existing settings persistence and compatibility

## Summary

This repo is the reference implementation for the actual user behavior. Use it as the behavioral source of truth, not as a candidate for a broad rewrite.

The safe AI workflow here is:

- stay local to the issue
- preserve compatibility
- minimize scope
- add regression coverage
- keep behavior boring and predictable
