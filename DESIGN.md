# PureFlow Design System

## Intent

PureFlow is a familiar VSCodium workstation refined for long engineering sessions. Near-black structure carries the editor; mineral teal marks the current tool or trusted live state; amber is reserved for uncertainty and warnings. The experience should read as one IDE, not a website embedded inside one.

The reference concept is [`docs/design/ide-workspace-concept.png`](docs/design/ide-workspace-concept.png).

## Information Architecture

The native VSCodium layout remains intact:

- Activity Bar and native primary sidebar on the user's chosen side; Explorer remains an upstream view.
- Native editor in the center.
- Native panel for terminal, tests, output, problems, and debug console.
- PureFlow as an Activity Bar view in the primary sidebar by default. A user may move it to the Secondary Side Bar when they want Explorer and PureFlow visible together.
- One compact Status Bar item for project, selection, or active Focus state.

The PureFlow sidebar has four peer routes:

1. **Workspace** — current folder, file, language, Git state, and native project actions.
2. **Mentor** — Explain, Explain why, Quiz me, Find docs, and Review reasoning for an explicit selection.
3. **Focus** — optional Rep controls and user-recorded evidence, compact enough for a sidebar.
4. **Monad** — Testnet health, address or transaction inspection, project diagnostics, and proof handoff.

No route opens a central editor tab. No route is required before ordinary editing.

## Color

The distribution theme is the source of truth. Webviews consume `--vscode-*` variables and add only a restrained product accent.

```css
:root {
  --pureflow-accent: oklch(0.69 0.13 198);
  --pureflow-accent-strong: oklch(0.55 0.11 198);
  --pureflow-amber: oklch(0.78 0.13 78);
  --pureflow-danger: oklch(0.65 0.16 25);
}
```

The PureFlow Mineral theme uses near-black editor and sidebar surfaces, cool charcoal borders, mineral teal focus and selection accents, and accessible terminal, diff, diagnostic, and Git colors. Syntax remains familiar rather than being recolored into brand decoration.

## Typography

Use VS Code's UI font for chrome and `--vscode-editor-font-family` for code, hashes, paths, chain values, time, and structured evidence. Sidebar type stays between 11 and 16 pixels. Headings are short and sentence-cased; prose wraps naturally with no marketing-sized hero text.

## Layout

Design sidebar-first at 320 pixels and verify 240, 320, and 420 pixels. Use open sections, dividers, compact rows, and disclosure controls instead of floating card grids. Primary buttons may span the sidebar; secondary actions should wrap or form a two-column row. Long paths, selections, addresses, hashes, and errors must truncate visually while remaining available in a tooltip or copy action.

## Components

- **Workbench header:** small mark, current workspace, current file, and a quiet live-state dot.
- **Route strip:** Workspace, Mentor, Focus, and Monad with icon plus label; never more than four peers.
- **Context block:** relative file path, language, line range, and selection size. No absolute path.
- **Mentor action row:** explicit one-shot actions. Results identify a configured coach or local guide; documentation results identify official or community sources.
- **Mentor response:** concise sections for behavior, reasoning, edge cases, and questions; no Apply button.
- **Workspace row:** native Open Folder, Create Project, Terminal, Tasks, and Source Control commands.
- **Monad health row:** chain ID, latest/safe/finalized blocks, RPC latency, and last refresh.
- **Inspector:** accepts a syntactically valid address or transaction hash and shows only live RPC results plus official explorer links.
- **Focus disclosure:** collapsed by default; timer and finish action appear only while a Rep is active.
- **Status Bar item:** compact and clickable. It opens a project with no workspace, opens PureFlow during normal work, offers Explain for a selection, and shows elapsed Focus time during a Rep.

## Interaction

Editor context menus and the command palette are equal entry points to the sidebar. Explain, Why, Quiz, and Find docs use the current explicit selection. When no selection exists, Quiz current function may use a bounded document-symbol range after the user invokes it. PureFlow never watches or uploads background code.

Opening or creating a folder uses native VSCodium dialogs and reload behavior. Opening a terminal, tests, source control, or settings delegates to native commands. PureFlow should not reimplement mature IDE surfaces.

Restricted Mode leaves the sidebar, local guide, and safe read-only tools available. Configured coach calls remain disabled, workspace-defined network settings are ignored, and native VSCodium trust restrictions continue to govern terminal, task, and repository actions.

Future Monad write actions hand off to the web companion and a user-controlled wallet. The IDE never stores a wallet key. When writes are implemented, gas UI must use the estimated gas limit with at most a 10% buffer and label pending, safe, and finalized states accurately.

## Motion

Transitions are 120–180 milliseconds and communicate route or disclosure state only. Reduced-motion mode removes transforms and animated progress. Timers update text without pulsing every second.

## Content

Use direct engineering language: “Explain why,” “Quiz me,” “Read from Monad Testnet,” “Prepared, not published,” and “Open project.” Use `live` for successful RPC reads; reserve `published` and `verified` for a real receipt plus a follow-up contract read. Avoid “training console,” “level up,” “AI magic,” and any claim that manual practice guarantees skill recovery.
