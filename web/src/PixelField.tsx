import React, { useEffect, useRef } from "react";

/** Animated mineral pixel mesh for the companion only (not IDE chrome). */
export const PixelField = React.memo(function PixelField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let raf = 0;
    let cell = 10;
    let cachedW = 0;
    let cachedH = 0;
    let cols = 0;
    let rows = 0;
    let vignetteGradient: CanvasGradient | null = null;

    const palette = [
      [30, 30, 30],       // 0: very dark grey
      [50, 50, 50],       // 1: dark grey
      [80, 80, 80],       // 2: grey
      [120, 120, 120],    // 3: light grey
      [24, 76, 54],       // 4: dark green
      [46, 142, 94],      // 5: green
      [74, 214, 142],     // 6: bright green
    ] as const;

    const resize = () => {
      // ⚡ Bolt: Cache window dimensions to avoid expensive DOM reads on every frame.
      // Expected impact: Eliminates forced synchronous layouts per frame.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      cachedW = w;
      cachedH = h;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = w < 720 ? 9 : 11;
      cols = Math.ceil(w / cell) + 2;
      rows = Math.ceil(h / cell) + 2;

      // ⚡ Bolt: Pre-compute CanvasGradient during resize rather than creating it inside the 60fps draw loop.
      // Expected impact: Eliminates object allocations and string parsing per frame.
      vignetteGradient = ctx.createRadialGradient(w * 0.75, h * 0.32, 40, w * 0.55, h * 0.45, Math.max(w, h) * 0.75);
      vignetteGradient.addColorStop(0, "rgba(0,0,0,0)");
      vignetteGradient.addColorStop(0.55, "rgba(0,0,0,0.15)");
      vignetteGradient.addColorStop(1, "rgba(0,0,0,0.72)");
    };

    const hash = (x: number, y: number) => {
      let n = x * 374761393 + y * 668265263;
      n = (n ^ (n >> 13)) * 1274126177;
      return ((n ^ (n >> 16)) >>> 0) / 4294967295;
    };

    const draw = (t: number) => {
      ctx.fillStyle = "oklch(0.085 0 0)";
      ctx.fillRect(0, 0, cachedW, cachedH);

      const time = reduceMotion ? 0 : t * 0.00018;

      // ⚡ Bolt: Loop order swapped (x outer, y inner) to hoist the expensive curve `Math.sin` calculation.
      // Expected impact: Reduces `Math.sin` calls for the curve from O(cols * rows) to O(cols), saving ~19k ops/frame on 1080p.
      for (let x = 0; x < cols; x++) {
        // A sweeping curve similar to Trae hero image
        // Originates from bottom left, swoops up to middle right
        const nx = x / cols;
        const curve = 0.5 + Math.sin((nx - 0.2) * Math.PI) * 0.3;
        const widthFactor = 0.2 + nx * 0.8;

        for (let y = 0; y < rows; y++) {
          const ny = y / rows;
          const dist = Math.abs(ny - curve);

          // Width of the band
          const focus = Math.max(0, 1.0 - dist * 2.5) * widthFactor;

          const wave = Math.sin(x * 0.12 + y * 0.18 + time * 4) * 0.5 + 0.5;
          const spark = Math.sin(x * 0.09 - y * 0.07 + time * 5) * 0.5 + 0.5;
          const n = hash(x, y + Math.floor(time * 6));

          const energy = focus * (0.4 + wave * 0.4 + spark * 0.2) * (0.4 + n * 0.6);

          if (energy < 0.12) continue;

          let idx = 0;
          if (energy > 0.8) idx = n > 0.7 ? 6 : (n > 0.4 ? 5 : 4);
          else if (energy > 0.6) idx = n > 0.8 ? 5 : (n > 0.5 ? 4 : 3);
          else if (energy > 0.4) idx = n > 0.9 ? 4 : 2;
          else if (energy > 0.25) idx = 1;
          else idx = 0;

          const [r, g, b] = palette[idx]!;
          const a = Math.min(0.95, 0.2 + energy * 1.5);
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          // Slight size jitter for living field without blur/glass.
          const s = energy > 0.7 ? cell : cell - 1;
          ctx.fillRect(x * cell, y * cell, s, s);
        }
      }

      // Soft vignette so copy stays readable.
      if (vignetteGradient) {
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, cachedW, cachedH);
      }
    };

    const tick = (now: number) => {
      draw(now);
      frame += 1;
      if (!reduceMotion) raf = requestAnimationFrame(tick);
    };

    resize();
    draw(0);
    if (!reduceMotion) raf = requestAnimationFrame(tick);

    const onResize = () => {
      resize();
      draw(performance.now());
    };
    window.addEventListener("resize", onResize);

    // Slow re-render even with reduced motion so resize stays correct.
    let interval = 0;
    if (reduceMotion) {
      interval = window.setInterval(() => draw(0), 4000);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (interval) window.clearInterval(interval);
      void frame;
    };
  }, []);

  return <canvas className="pixel-canvas" ref={canvasRef} aria-hidden="true" />;
});
