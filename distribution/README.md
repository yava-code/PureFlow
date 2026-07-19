# PureFlow portable VSCodium

The Windows builder creates a separate, portable VSCodium environment with PureFlow product defaults — not a naked upstream install with an extension dropped in.

```powershell
powershell -ExecutionPolicy Bypass -File .\distribution\build-windows.ps1
```

## What makes this a PureFlow product profile

| Layer | What ships |
|-------|------------|
| Host | Official VSCodium win32-x64 (checksum verified) |
| Identity | `product.json` short/long names and PureFlow application naming where safe |
| Theme | PureFlow Mineral (bundled extension theme) |
| Defaults | `data/user-data/User/settings.json` — telemetry off, theme, editor discipline, inline AI suggest off |
| Keybindings | PureFlow mentor / Focus / docs / Monad shortcuts |
| Extension | Packaged PureFlow VSIX installed into the portable `data/extensions` tree |
| Launcher | `PureFlow.cmd` best-effort `--disable-extension` for common AI assistants |

The builder does **not** modify a system VS Code or VSCodium install. It refuses to overwrite an existing output directory.

## AI boundary (honest)

`PureFlow.cmd` disables known AI extension IDs for this profile. That reduces temptation inside PureFlow; it does **not** claim to block a browser, phone, local model, unknown extension, or copy-paste to another tool.

Optional coach (Groq or any OpenAI-compatible endpoint) is configured through **PureFlow: Configure Optional Coach**. The API key is stored in VS Code SecretStorage. Coach calls stay disabled during an active Focus Rep and in Restricted Mode.

## Build steps (summary)

1. Test and package the extension VSIX.
2. Download the latest official VSCodium `win32-x64` archive.
3. Verify the archive against the release SHA-256.
4. Create an isolated portable profile under `release/`.
5. Apply branding, settings, keybindings, and install the VSIX.
6. Copy the PureFlow launcher.

Run `PureFlow.cmd <repository>` from the generated directory.

The extension remains independently installable in VS Code/VSCodium for development. The portable package is the distinct product experience for daily use and demos.
