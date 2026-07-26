## 2024-03-22 - Optimizing Canvas `requestAnimationFrame` Loops

**Learning:** When dealing with grid-based canvas drawing (like `PixelField`), the loop nesting order (e.g., `x` then `y` vs `y` then `x`) dramatically impacts performance if computations depend only on the outer loop variable. In `PixelField`, the horizontal curve offset (`curve`) depended solely on `x`. By iterating `y` first, `Math.sin` was calculated for every single cell ($cols \times rows$).

**Action:** Always analyze nested loops in `requestAnimationFrame` for loop invariant code motion opportunities. Hoist calculations that depend only on the outer loop's index out of the inner loop.

## 2024-03-22 - CanvasGradient Per-Frame Overhead

**Learning:** Recreating `CanvasGradient` objects (like `createRadialGradient`) inside a 60fps render loop causes unnecessary garbage collection pressure and CPU overhead from parsing color strings (`addColorStop`).

**Action:** Cache gradients and dimension measurements at the `resize` event level rather than the `draw` level, as they only change when the window bounds change.
## 2024-05-18 - App-wide Re-renders from Root Timers

**Learning:** When a React state that updates frequently (e.g., `now` updating every second) is placed at the top level of the app (`App.tsx`), it causes the entire component tree to re-render. If this state is only needed by a deeply nested component (e.g., a countdown timer), it introduces massive unnecessary overhead.
**Action:** Push frequently updating state down the component tree as close as possible to where it is used. Avoid placing intervals in root components.
