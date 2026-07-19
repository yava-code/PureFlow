# Cache Lab

This small workspace is the repeatable PureFlow demo. Its cache accepts an injected clock so the expiry invariant can be tested without waiting in real time.

The current implementation intentionally reuses expired entries. Run `npm test`, form a hypothesis in Debug Notebook, fix the comparison in `src/cache.js`, then run the test again. No dependencies are required.
