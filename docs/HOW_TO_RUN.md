# Как запустить PureFlow

Три способа: **быстро (релиз)**, **расширение в VS Code**, **сайт companion**.

---

## 1) Самый простой — Windows portable (продукт)

1. Открой: https://github.com/yava-code/PureFlow/releases/latest  
2. Скачай ZIP portable (не только VSIX).  
3. Распакуй в папку, например `D:\PureFlow`.  
4. Запусти **`PureFlow.cmd`** (двойной клик).  
5. **File → Open Folder** — открой любой свой проект **или**  
   Command Palette (`Ctrl+Shift+P`) → **PureFlow: Open Project** / **Create Project**.  
6. Слева Activity Bar → иконка **PureFlow** (или `Ctrl+Alt+P`) → sidebar Workspace / Mentor / Focus / Monad.

### Полезные хоткеи

| Клавиши | Действие |
|---------|----------|
| `Ctrl+Alt+P` | Open PureFlow workbench |
| `Ctrl+Alt+Y` | Explain why (нужен selection) |
| `Ctrl+Alt+D` | Find docs по selection |

### Демо-баг (Focus)

1. Open folder: репозиторий → `demo/cache-lab`  
2. Terminal / Tests → увидеть failing test  
3. PureFlow → **Focus** → Start Focus Rep  
4. Починить код руками (AI mentor во время Focus offline)

### Monad

Sidebar → **Monad** → Refresh. Chain ID должен быть **10143**.  
Registry: `0xB51B276e6Ee9Cad8181C368bbF6d6efB82c154c8`

---

## 2) Только extension (если уже есть VS Code / VSCodium)

```powershell
cd D:\pureflow\extension   # или clone репо
npm ci
npm run package
```

1. VS Code → Extensions → `...` → **Install from VSIX** → `pureflow-0.1.0.vsix`  
2. `Ctrl+Alt+P` → PureFlow workbench  
3. Theme (optional): **PureFlow Mineral**

Для разработки extension с hot reload:

```powershell
cd extension
npm ci
npm run watch
# F5 в VS Code на папке extension (Extension Development Host)
```

---

## 3) Web companion (публичный demo для Spark)

**Уже задеплоен:** https://yava-code.github.io/PureFlow/

Локально:

```powershell
cd web
npm ci
npm run dev
```

Открой URL, который напечатает Vite (обычно `http://localhost:5173`).

---

## 4) Собрать portable самому

Нужны: Node 22+, npm, Windows x64.

```powershell
cd D:\pureflow
$out = ".\release\portable-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
powershell -ExecutionPolicy Bypass -File .\distribution\build-windows.ps1 -OutputRoot $out
```

Затем: `$out\...\PureFlow.cmd`

---

## 5) Контракты (не нужно для обычного запуска IDE)

```powershell
cd contracts
npm ci
npm test
```

Onchain уже: Testnet registry `0xB51B276e6Ee9Cad8181C368bbF6d6efB82c154c8`.

---

## Если что-то не видно

| Проблема | Решение |
|----------|---------|
| Нет sidebar PureFlow | `Ctrl+Alt+P` или View → Open View… → PureFlow |
| Explorer + PureFlow вместе | на view PureFlow → Move View → Secondary Side Bar |
| Mentor «select code» | выдели код в editor |
| Monad offline | RPC/сеть; refresh; это Testnet |
| Coach | Command: **PureFlow: Configure Optional Coach** (Groq ok) |

Cover image: `docs/design/spark-cover.png` (после генерации).
