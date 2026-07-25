## 2024-03-22 - Optimizing Canvas `requestAnimationFrame` Loops

**Learning:** When dealing with grid-based canvas drawing (like `PixelField`), the loop nesting order (e.g., `x` then `y` vs `y` then `x`) dramatically impacts performance if computations depend only on the outer loop variable. In `PixelField`, the horizontal curve offset (`curve`) depended solely on `x`. By iterating `y` first, `Math.sin` was calculated for every single cell ($cols \times rows$).

**Action:** Always analyze nested loops in `requestAnimationFrame` for loop invariant code motion opportunities. Hoist calculations that depend only on the outer loop's index out of the inner loop.

## 2024-03-22 - CanvasGradient Per-Frame Overhead

**Learning:** Recreating `CanvasGradient` objects (like `createRadialGradient`) inside a 60fps render loop causes unnecessary garbage collection pressure and CPU overhead from parsing color strings (`addColorStop`).

**Action:** Cache gradients and dimension measurements at the `resize` event level rather than the `draw` level, as they only change when the window bounds change.