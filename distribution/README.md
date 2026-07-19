# PureFlow portable VSCodium

The Windows builder creates a separate, portable VSCodium environment with the PureFlow extension bundled into its own data directory. It does not modify a system VSCodium or VS Code installation.

```powershell
powershell -ExecutionPolicy Bypass -File .\distribution\build-windows.ps1
```

The builder:

1. tests and packages the extension;
2. downloads the latest official VSCodium `win32-x64` archive;
3. verifies the archive against the release SHA-256;
4. creates an isolated portable profile under `release/`;
5. installs PureFlow into that profile;
6. adds a launcher that disables known AI extensions by ID.

Run `PureFlow.cmd <repository>` from the generated directory. The shield is intentionally best effort: it reduces temptation inside this IDE profile and does not claim to block a browser, phone, local model, or unknown extension.

The extension remains independently installable in VS Code/VSCodium. This makes development and open-source adoption practical while the portable package provides the distinct PureFlow product experience.

