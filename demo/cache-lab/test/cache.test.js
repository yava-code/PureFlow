import assert from "node:assert/strict";
import test from "node:test";
import { createCache } from "../src/cache.js";

test("reuses a live entry and refreshes an expired one", async () => {
  let time = 1_000;
  let loads = 0;
  const get = createCache(async () => `value-${++loads}`, 50, () => time);

  assert.equal(await get("profile"), "value-1");
  time += 20;
  assert.equal(await get("profile"), "value-1");
  time += 50;
  assert.equal(await get("profile"), "value-2");
  assert.equal(loads, 2);
});
