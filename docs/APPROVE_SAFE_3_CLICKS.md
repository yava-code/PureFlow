# 3 клика — только это (полчаса)

Я **не могу** нажать MetaMask за тебя (приватный ключ только у тебя).  
Я уже сделал Safe + put tx в очередь (подпись agent 1/2).

## Перед кликами (30 сек)

1. MetaMask открыт  
2. Аккаунт: **первый** `0xbcE7b3eB6Cf8b23957547FbCCA21333bB85CB1A7`  
3. Сеть: **Monad Testnet** (Chain ID **10143**)  
4. Если MON = 0 → https://faucet.monad.xyz → тот же адрес → Get testnet MON → подожди 30 сек

## Клик 1 — открой очередь

Скопируй в Chrome/Edge **целиком**:

```text
https://app.safe.global/transactions/queue?safe=monad-testnet:0x0Eb17425255d826e1FbAF5c473A238bB3EAd8a92
```

## Клик 2 — Connect

- **Connect** → **MetaMask**  
- Если спросит сеть — **Monad Testnet**  
- Если «wrong account» — в MetaMask переключи на `0xbcE7…B1A7`

## Клик 3 — Confirm + Execute

1. Увидишь **1 pending** transaction (Deploy / CreateCall)  
2. **Confirm** / **Sign** → в MetaMask **Confirm**  
3. Когда станет **2/2** → кнопка **Execute** → MetaMask **Confirm**  
4. Дождись success  

## Клик 4 — пришли мне hash

После Execute: клик на tx → **Copy** hash `0x…`  
**Вставь hash в чат** — я сразу:

- проверю деплой  
- вытащу **contract address**  
- пропишу в сайт  
- дам поля формы Spark  

---

### Если страшно / пусто

| Симптом | Что делать |
|---------|------------|
| «No Safe» / 404 | Ссылка целиком, сеть monadt-testnet в URL |
| «You are not an owner» | MetaMask = `0xbcE7…` или `0xd6dD…` |
| Не хватает MON | faucet.monad.xyz |
| Нет pending | Обнови страницу F5; tx ещё: safeTxHash `0xf49437f5c49706925db05402f709d0857c4e9afe71505f50e35b0437d9075ab1` |

### Safe адрес (на всякий)

`0x0Eb17425255d826e1FbAF5c473A238bB3EAd8a92`
