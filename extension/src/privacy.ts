export function safeFileLabel(fileName: string, relativePath?: string): string {
  const fallback = basename(fileName);
  if (!relativePath) return fallback;

  const path = relativePath.replaceAll("\\", "/").trim();
  if (!path || path.startsWith("/") || /^[a-z]:\//i.test(path) || path.split("/").includes("..")) {
    return fallback;
  }
  return path;
}

function basename(path: string): string {
  return path.replaceAll("\\", "/").split("/").at(-1) ?? path;
}
