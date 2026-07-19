# PureFlow Design System

## Intent

The physical scene is a quiet lab at dusk: one developer, subdued ambient light, precise instrumentation, and no sense of being watched. The product uses a restrained color strategy; near-black structure carries the workspace while mineral teal appears only for current state and primary action, with amber reserved for unresolved hypotheses.

## Color

All implementation colors use OKLCH.

```css
:root {
  --bg: oklch(0.085 0 0);
  --surface: oklch(0.125 0.008 200);
  --surface-raised: oklch(0.165 0.011 200);
  --ink: oklch(0.93 0.006 200);
  --muted: oklch(0.68 0.012 200);
  --primary: oklch(0.69 0.13 198);
  --primary-strong: oklch(0.55 0.11 198);
  --amber: oklch(0.78 0.13 78);
  --danger: oklch(0.65 0.16 25);
  --border: oklch(0.28 0.012 200);
}
```

Text against the main background targets at least 7:1 contrast. Statuses pair color with an icon and explicit label.

## Typography

Use the VS Code/system sans stack for chrome and a system monospace stack for goals, timestamps, source metadata, hypotheses, and numeric summaries. Product typography uses a fixed rem scale from 0.75rem to 1.75rem. Headings use balanced wrapping; prose is capped at 72 characters.

## Layout

The primary surface is a full-height webview inside VSCodium. Open bands, rails, dividers, and lists are preferred to nested cards. A wide panel may use two columns for the Rep Card and Senior Defense; below 820px these become a single column. The current goal, remaining time, and Finish action remain visible in a sticky header.

## Components

- Open-loop mark: geometric, quiet, recognizable at activity-bar size.
- Session header: brand, explicit mode, timer, and one terminal action.
- Timeline rail: chronological events with time and terse evidence.
- Knowledge results: source-first rows with publisher, version/date, and outbound action.
- Recall Ladder: four ordered disclosure levels with clear locked, available, and revealed states.
- Debug Notebook: one hypothesis at a time, followed by confirmed or rejected evidence.
- Rep Card: privacy-safe summary with no code or file names.
- Defense boundary: consent fields precede questions; review findings remain sealed until answers.

Controls share 8px radii, 1px borders, 150-220ms state transitions, consistent hover/focus/disabled/loading behavior, and no wide decorative shadows.

## Motion

Motion communicates state only: a timer pulse at minute boundaries, a 180ms disclosure transition, and a short timeline insertion. Reduced-motion mode removes transforms and uses immediate state changes.

## Content

Language is direct and non-judgmental. Say “AI is offline during this Rep,” “Finish Rep,” and “What did you learn?” Avoid “clean,” “cheating,” “violation,” “productivity,” and numeric skill labels.

