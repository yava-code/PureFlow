export function cacheKey(tenant: string, id: string): string {
  return `${tenant}:${id}`;
}
