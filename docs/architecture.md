# Architecture

PureFlow ships as a branded VSCodium distribution with one bundled extension. The distribution supplies the isolated profile and product identity; the extension owns the session workflow and can also be installed in VS Code for development and adoption.

```text
PureFlow VSCodium distribution
├── isolated profile and allowlisted extensions
├── bundled PureFlow extension
│   ├── extension host: files, Git, tasks, tests, storage
│   ├── webview: Rep workflow and local UI
│   ├── local doc pack and Stack Exchange search
│   └── optional coach provider outside Pure Mode
├── launcher scripts for Windows, macOS, and Linux
└── optional Monad Testnet attestation
```

## Runtime boundaries

- Before a Rep, the coach may produce a frozen Session Pack from explicitly selected context.
- During a Rep, no model request is available. The extension exposes deterministic docs, tests, debugger access, sealed hints, and local notes.
- After a Rep, the user chooses whether to share a Git diff, test results, or session notes with a coach provider.
- Rep events are appended locally. Code, filenames, clipboard content, and terminal output are excluded by default.

## Monad component

`RepRegistry` records a commitment to a privacy-safe Rep summary. The contract emits the developer address, commitment, focused duration, test/debug counts, ownership self-report, and timestamp. The summary itself remains local, so the chain proves that a wallet made a permanent commitment without publishing repository details.

This is deliberately optional for normal PureFlow use. It exists because permanent public commitments are composable and censorship-resistant; preferences, notes, search, and session history remain offchain.

