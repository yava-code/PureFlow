@echo off
setlocal
set "ROOT=%~dp0"
set "APP=%ROOT%VSCodium.exe"
if not exist "%APP%" (
  echo PureFlow could not find VSCodium.exe next to this launcher.
  exit /b 1
)

rem Best-effort AI surface reduction for this profile only.
rem Does not claim to block browsers, phones, local models, or unknown extensions.
start "PureFlow" "%APP%" ^
  --disable-extension github.copilot ^
  --disable-extension github.copilot-chat ^
  --disable-extension github.copilot-chat-vscode ^
  --disable-extension anthropic.claude-code ^
  --disable-extension continue.continue ^
  --disable-extension codeium.codeium ^
  --disable-extension tabnine.tabnine-vscode ^
  --disable-extension sourcegraph.cody-ai ^
  --disable-extension supermaven.supermaven ^
  --disable-extension saoudrizwan.claude-dev ^
  --disable-extension rooveterinaryinc.roo-cline ^
  --disable-extension kilocode.kilo-code ^
  --disable-extension amazonwebservices.amazon-q-vscode ^
  --disable-extension google.geminicodeassist ^
  %*
