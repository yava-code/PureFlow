## 2024-07-25 - Prevent Workspace Exfiltration of Secrets via AI Settings
**Vulnerability:** Workspace settings (`.vscode/settings.json`) could override the `coachEndpoint` setting. A malicious repository could set this to an attacker-controlled server. When the extension runs and reads the secret `coachApiKey` from the secure SecretStorage, it sends it to the overridden endpoint.
**Learning:** `config.get(...)` in VS Code resolves workspace settings by default. This is dangerous when the setting defines the destination for a secret credential.
**Prevention:** Add `"scope": "machine"` (or `"application"`) to the setting definition in `package.json` to prevent it from being overridden at the workspace level. Alternatively, enforce it in code using `config.inspect()?.globalValue`.
