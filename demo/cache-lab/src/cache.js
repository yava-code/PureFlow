export function createCache(load, ttlMs, now = Date.now) {
  const values = new Map();

  return async function get(key) {
    const cached = values.get(key);
    if (cached && cached.expiresAt < now()) return cached.value;

    const value = await load(key);
    values.set(key, { value, expiresAt: now() + ttlMs });
    return value;
  };
}
