# RepRegistry

`RepRegistry` records a permanent commitment to a completed PureFlow Rep without putting repository details onchain. A client hashes the canonical privacy-safe summary locally, then submits the hash and a few aggregate counters.

## Test

```bash
npm --prefix contracts install
npm --prefix contracts test
```

## Deploy to Monad Testnet

Deployment uses the encrypted Monskills agent wallet and the Monad Testnet RPC. Never commit or paste a private key into this repository.

After deployment, verify the address has bytecode:

```bash
curl -s https://testnet-rpc.monad.xyz \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["<address>","latest"]}'
```

Contract source verification uses the Monad multi-explorer verification API described in the installed Monskills scaffold.
