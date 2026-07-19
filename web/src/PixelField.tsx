import { useEffect, useRef } from "react";

/** Animated mineral pixel mesh for the companion only (not IDE chrome). */
export function PixelField() {
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

    const palette = [
      [14, 28, 30],
      [18, 52, 56],
      [32, 110, 112],
      [58, 170, 168],
      [88, 92, 180],
      [160, 96, 72],
      [42, 36, 70],
      [8, 12, 14],
    ] as const;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = w < 720 ? 9 : 11;
    };

    const hash = (x: number, y: number) => {
      let n = x * 374761393 + y * 668265263;
      n = (n ^ (n >> 13)) * 1274126177;
      return ((n ^ (n >> 16)) >>> 0) / 4294967295;
    };

    const draw = (t: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.fillStyle = "oklch(0.085 0 0)";
      ctx.fillRect(0, 0, w, h);

      const cols = Math.ceil(w / cell) + 2;
      const rows = Math.ceil(h / cell) + 2;
      const time = reduceMotion ? 0 : t * 0.00018;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Focus density toward the right hero edge (BA-like cascade).
          const nx = x / cols;
          const ny = y / rows;
          const focus = Math.pow(Math.max(0, nx - 0.28) / 0.72, 1.15) * (1 - Math.abs(ny - 0.38) * 0.9);
          const wave = Math.sin(x * 0.21 + y * 0.13 + time * 6) * 0.5 + 0.5;
          const spark = Math.sin(x * 0.07 - y * 0.11 + time * 3.2) * 0.5 + 0.5;
          const n = hash(x, y + Math.floor(time * 4));
          const energy = focus * (0.45 + wave * 0.35 + spark * 0.2) * (0.55 + n * 0.55);

          if (energy < 0.12) continue;

          let idx = 0;
          if (energy > 0.78) idx = n > 0.7 ? 5 : 3;
          else if (energy > 0.58) idx = n > 0.55 ? 4 : 3;
          else if (energy > 0.4) idx = 2;
          else if (energy > 0.25) idx = 1;
          else idx = n > 0.5 ? 6 : 0;

          const [r, g, b] = palette[idx]!;
          const a = Math.min(0.95, 0.18 + energy * 0.85);
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          // Slight size jitter for living field without blur/glass.
          const s = energy > 0.7 ? cell : cell - 1;
          ctx.fillRect(x * cell, y * cell, s, s);
        }
      }

      // Soft vignette so copy stays readable.
      const g = ctx.createRadialGradient(w * 0.75, h * 0.32, 40, w * 0.55, h * 0.45, Math.max(w, h) * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.55, "rgba(0,0,0,0.15)");
      g.addColorStop(1, "rgba(0,0,0,0.72)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
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
}
