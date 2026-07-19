# Сдать PureFlow в Spark — прямо сейчас

Официальная страница: <https://buildanything.so/hackathons/spark>  
Форма: войти → join / submit project (solo).

**Внимание по времени:** по правилам окно submissions **13–19 Jul 2026, 23:59 UTC**. Если форма ещё открыта — сдавай немедленно. Если закрыта — страница скажет; код всё равно оставляем submission-ready.

---

## Статус соответствия правилам (честно)

| Правило Spark | Статус | Что делать |
|---|---|---|
| Solo | ✅ | Сдаёшь один |
| Public GitHub | ✅ | https://github.com/yava-code/PureFlow |
| Hosted web demo | ✅ | https://yava-code.github.io/PureFlow/ |
| Onchain Monad (mainnet/testnet) | ⚠️ **блокер** | Нужен **deployed contract address** на Testnet |
| Demo video ≤ 3 min, public URL | ⚠️ **блокер** | Запиши и вставь URL (YouTube unlisted / Loom) |
| Name / Description / Problem / Solution | ✅ | Копируй ниже |
| Category | ✅ | **Monad Testnet** |
| Post URL (viral prize only) | optional | Не обязателен для базовой сдачи |
| Age 18+ / eligible jurisdiction | 👤 **ты** | Галочка на форме; репозиторий это не доказывает |
| No AI slop / no fake success | ✅ | Live RPC, prepared ≠ verified |
| No vaporware | ✅ | Реальный portable IDE + companion |
| Judging agent: pre-hack history | ✅ | Коммиты внутри окна хакатона |

**Agent wallet (уже есть, 1 Testnet MON):**  
`0xe0D9466626be495C8ECC339E6866f72E9dad06C9`  
Safe ещё **не** создан. По Monskills деплой `RepRegistry` только через 2-of-3 Safe + `propose.sh` + твоё approve.

---

## Блокеры, без которых форма «Contract address» / «Demo video» пустые

### 1) Contract address (обязательно)

Пришли **два публичных Monad-compatible адреса** (MetaMask и т.п.) — **не** private keys.

Дальше агент/ты:

1. Создать 2-of-3 Safe: owners = `[ТВОЙ_1, ТВОЙ_2, agent 0xe0D9…06C9]`.
2. `propose.sh` деплой `RepRegistry`.
3. Ты approve + execute в Safe UI → вернуть **execution tx hash**.
4. `npm run verify:deployment -- <txHash>` → получить address.
5. Прописать address в extension/web env + companion (не называть verified source, пока explorer source verify не сделан; для Spark достаточно **deployed address** + bytecode check).

Пока address нет — **не выдумывай** и не пиши нули.

### 2) Demo video (обязательно)

Запись **≤ 3 минут**, публичная ссылка.

Windows: `Win+G` (Game Bar) или OBS → upload YouTube (Unlisted) / Loom / Streamable.

Сценарий: [`demo-script.md`](demo-script.md) (обновлённый тайминг ниже).

### 3) Eligibility

На форме подтверди: **18+** и не из excluded regions (Cuba, Iran, North Korea, occupied Ukraine regions).

---

## Копипаст в форму (готовые поля)

### Name

```text
PureFlow
```

### Description (few words)

```text
A daily VSCodium IDE that keeps coding muscles sharp: native project work first, optional no-AI Focus Reps on real code, explicit mentoring, and live Monad Testnet tools with privacy-safe commitments.
```

### Problem

```text
I ship faster with AI, but I slowly stop owning the system: less architecture sense, weaker debugging hypotheses, and less ability to explain my own code. I do not want a LeetCode site or a forced course — I want my real IDE back as deliberate practice.
```

### Solution

```text
PureFlow is a portable VSCodium product (not an empty fork): normal editor/Explorer/terminal/Git stay primary. Mentor help is explicit and bounded. Optional Focus Reps reclaim fluency on my real repo with AI offline. Monad tools read live Testnet state and prepare privacy-safe commitments — never fake verified success.
```

### Project URL

```text
https://yava-code.github.io/PureFlow/
```

### Github repo

```text
https://github.com/yava-code/PureFlow
```

### Category

```text
Monad Testnet
```

### Contract address

```text
<PASTE AFTER DEPLOY — example format 0x… 42 hex chars>
```

Пока нет деплоя — поле нельзя честно заполнить. После деплоя вставь address из verify script.

### Demo video

```text
<PASTE YouTube/Loom public URL after recording>
```

### Post URL (only for Most Viral prize)

```text
<optional X/Twitter or other public post>
```

---

## Demo video — 2:30 script (говори вслух)

| Time | Action |
|------|--------|
| 0:00–0:20 | Open companion https://yava-code.github.io/PureFlow/ — «Keep your coding muscles», live Monad band if online |
| 0:20–0:50 | Open PureFlow portable IDE, real folder, edit line, terminal, tests — native IDE |
| 0:50–1:20 | Select code → PureFlow → Explain why / Quiz — local guide label |
| 1:20–1:50 | Monad tab: chain 10143, inspect fixture `0xa2b006…cf8` or known tx — explorer link |
| 1:50–2:20 | Focus tab: start short Rep goal, one hypothesis, AI offline note |
| 2:20–2:40 | Proof «Prepared, not published» + if registry live: show address/verify |
| 2:40–2:50 | GitHub + release URLs; end |

Do **not** claim verified onchain success without real receipt.

Fixture tx (third-party, not our registry):  
https://testnet.monadscan.com/tx/0x20c7f773bfaf3b60edd05443955d6168959d76cd8e4f5aa56a1a8fea041b41b0

---

## Порядок кликов на BuildAnything

1. https://buildanything.so/login  
2. Open https://buildanything.so/hackathons/spark  
3. **Sign in to join** / Submit project (Solo — no team)  
4. Paste fields above  
5. Eligibility checkboxes  
6. Submit  

Optional after submit: social post for viral track.

---

## Что уже готово без тебя

- Public repo with regular commits  
- Hosted companion (live RPC, pixel brand, honest states)  
- Windows release v0.1.0  
- Extension mentor / Focus / Monad  
- `RepRegistry` source + tests + Safe prepare tooling  
- Agent wallet funded (1 MON)  

## Что только ты можешь закрыть за 30–90 минут

1. **Два public owner address** → Safe → approve deploy → contract address  
2. **Запись видео** → public URL  
3. **Submit form** + eligibility  

Как только пришлёшь **два адреса**, можно сразу создать Safe и предложить деплой через `propose.sh` (вывод QR оставить как есть).
