@echo off
setlocal
set "ROOT=%~dp0"
set "APP=%ROOT%VSCodium.exe"
if not exist "%APP%" (
  echo PureFlow could not find VSCodium.exe next to this launcher.
  exit /b 1
)

start "PureFlow" "%APP%" ^
  --disable-extension github.copilot ^
  --disable-extension github.copilot-chat ^
  --disable-extension anthropic.claude-code ^
  --disable-extension continue.continue ^
  --disable-extension codeium.codeium ^
  --disable-extension tabnine.tabnine-vscode ^
  %*
