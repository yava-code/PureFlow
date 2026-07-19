import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const configs = [
  {
    entryPoints: ["src/extension.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    outfile: "dist/extension.js",
    external: ["vscode"],
    sourcemap: true,
  },
  {
    entryPoints: ["webview/main.tsx"],
    bundle: true,
    platform: "browser",
    format: "iife",
    target: "es2022",
    outfile: "dist/webview.js",
    sourcemap: true,
    minify: !watch,
    define: { "process.env.NODE_ENV": JSON.stringify(watch ? "development" : "production") },
    loader: { ".svg": "dataurl" },
  },
];

if (watch) {
  const contexts = await Promise.all(configs.map((config) => esbuild.context(config)));
  await Promise.all(contexts.map((context) => context.watch()));
  console.log("Watching PureFlow extension and webview…");
} else {
  await Promise.all(configs.map((config) => esbuild.build(config)));
}
