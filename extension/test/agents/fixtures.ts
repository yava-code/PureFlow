import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function createDisposableWorktree(): { worktreePath: string, cleanup: () => void } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pureflow-agent-fixture-'));

  const packageJson = {
    name: "cache-lab",
    version: "1.0.0",
    main: "src/index.js",
    scripts: {
      test: "vitest run"
    }
  };

  const cacheCode = `
export class Cache {
  private store = new Map<string, any>();

  set(key: string, value: any, ttl?: number) {
    this.store.set(key, { value, expiresAt: ttl ? Date.now() + ttl : null });
  }

  get(key: string) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }
}
`;

  const indexCode = `
export * from './cache';
`;

  const serviceCode = `
import { Cache } from './cache';
export class Service {
  constructor(private cache: Cache) {}
  async getData(key: string) {
    return this.cache.get(key);
  }
}
`;

  fs.mkdirSync(path.join(tmpDir, 'src'));
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  fs.writeFileSync(path.join(tmpDir, 'src', 'cache.ts'), cacheCode);
  fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), indexCode);
  fs.writeFileSync(path.join(tmpDir, 'src', 'service.ts'), serviceCode);

  return {
    worktreePath: tmpDir,
    cleanup: () => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  };
}
