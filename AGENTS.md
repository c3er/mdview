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
- When the requirements or next steps are unclear, ask the user for clarification before making a consequential choice.
- When multiple approaches are plausible and none is clearly best according to the existing behavior, architecture, or history, ask the user to choose between them.

## AI operating rules

This repository is the behavioral reference and the maintenance base for Markdown Viewer. The history before `v2.0.0` and the later maintenance commits show a consistent pattern: keep the app understandable, fix the actual problem, and avoid broad churn unless the refactor clearly reduces long-term risk.

Agents in this repo should follow these rules:

1. Prefer root-cause fixes over surface-level patches.
2. Keep scope tight and user-visible behavior stable.
3. Preserve compatibility with file path handling, URL decoding, rendering behavior, keyboard interactions, and OS-specific edge cases.
4. Do not reject justified refactors. A larger cleanup is acceptable when it eliminates duplication, makes a bug fix trustworthy, or reduces the chance of regression.
5. When refactoring, do it in a way that keeps the architecture legible and testable, not in a way that merely makes the code look modern.
6. History matters: the app’s fragile areas are navigation, rendering, search, settings, and anything involving relative file paths or external resources.

This repo should still permit opportunistic refactors if the motivation is maintainability, not cosmetics. The goal is not to over-engineer, but to avoid low-quality, “cheapest possible” code that becomes impossible to extend safely.

## Documentation maintenance

Documentation is part of the implementation and must always describe the current state. Keep `README.md`, `CONTRIBUTING.md`, everything under `doc/`, `AGENTS.md`, and any skills or other AI guidance up to date. Any code change that makes a documented statement inaccurate must update that documentation in the same change. AI guidance is especially important: do not leave obsolete instructions, architecture descriptions, workflows, or feature claims behind.

## Testing and validation

A good agent in this repo should include a small validation plan with each change, especially when the behavior is visual or interactive. This app is not only about passing unit tests; many realistic regressions are only visible in the UI.

Expected behavior:

1. Run the relevant automated tests first.
2. If the change touches file handling, rendering, navigation, search, or settings, provide a short manual smoke-test sequence.
3. Keep the manual steps concrete and easy to follow for a human operator.
4. If the change is behaviorally subtle, state what the reviewer should look for instead of only reporting that the code “should work.”

In short: do not assume that the AI is done after a passing test run. In this project, a brief test plan is often part of the fix.

## Version control

This project uses Git. Use read-only Git operations freely whenever the current code, its motivation, or the history of a decision is unclear. In particular, use commands such as `git log`, `git show`, `git blame`, and diffs to understand behavior, ownership, and the reason for existing code.

Git write operations require explicit user approval before they are performed. This includes `git commit`, `git merge`, `git rebase`, and comparable history- or worktree-changing operations. Before asking for approval, explain what will be changed and why; include the exact proposed commit message when a commit is involved. After approval, use the agreed commit message verbatim. If the user proposes a commit-message change, verify the intended wording and resolve any discrepancy before writing it.

Commit messages must provide enough context, together with their diffs, to understand the motivation for the change. Use a concise header line, normally no longer than 52 characters, followed by a blank line and an explanation. Body lines should normally not exceed 72 characters. Unbreakable strings such as URLs are exceptions; put each such long string on its own line, not necessarily in its own paragraph. The header does not need a `feat:`, `fix:`, or similar prefix. The explanation should focus on the motivation and, where it is not obvious, the relevant technical or architectural background; it should not merely repeat the diff. Keep the message as short as is sensible: a small change may need only a short title, while a more involved change needs an informative explanation.

Never run `git push`. Tell the user to perform pushes themselves.

## Architecture overview

This repo is not as cleanly layered as the refactor, but the main responsibilities are still recognizable:

### 1. Main process lifecycle

- `app/main.js`: main window lifecycle, menu setup, file opening, settings, navigation, reload handling, and OS integration.
- `app/lib/cliMain.js`: startup and CLI logic.
- `app/lib/menuMain.js`: menus and menu-state toggling.
- `app/lib/navigationMain.js`: current file path, history/back-forward navigation, and cross-location callbacks.
- `app/lib/windowManagementMain.js`: BrowserWindow lifecycle and instance tracking.

The main process is responsible for app-level state, browser-window lifecycle, IPC, and OS integration. The legacy application is more coupled than the refactor, so do not assume every current responsibility is in its ideal process or module. When making a justified refactor, preserve behavior first and move ownership incrementally.

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

The Git history here is strongly issue-driven and bugfix-oriented, with a long history of refinements beginning before `v2.0.0`. The project’s pattern is not just “small patches”; it is: understand the bug, patch the exact point of failure, preserve behavior, and keep the code understandable enough to survive the next fix.

This is especially visible in the wider history before `v2.0.0`, where work around navigation, search, raw text rendering, and settings matured through repeated fixes and refactors rather than a single rewrite. The app evolved by iterating on the actual pain points.

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
