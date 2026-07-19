# RepRegistry

`RepRegistry` records a permanent commitment to a completed PureFlow Rep without putting repository details onchain. The client hashes a canonical privacy-safe summary locally, then submits only the commitment and public aggregate counters.

## Build and test

```powershell
npm install
npm run build
npm test
```

## Monad Testnet deployment through Safe

Target network: Monad Testnet, chain ID `10143`, RPC `https://testnet-rpc.monad.xyz`.

Every deployment must be proposed through the Safe configured by Monskills. Do not broadcast `RepRegistry` directly from an EOA and do not put a private key in this repository. A Safe must already exist in `~/.monskills/multisig.json`; creating one requires the wallet owners chosen by the user.

### 1. Prepare and inspect the creation bytecode

```powershell
npm run prepare:safe
```

The command performs a production build and prints human-readable JSON containing the artifact identity, bytecode size, hash, CreateCall address, operation, and raw creation bytecode. It reads no key and sends no transaction.

For a raw-only value suitable for the Monskills wrapper:

```powershell
$env:DEPLOYMENT_BYTECODE = node .\scripts\prepare-safe-deployment.mjs --bytecode
```

`--bytecode` writes only the `0x`-prefixed creation bytecode to stdout.

### 2. Propose with the installed Monskills wrapper

Run this from Git Bash at the repository root. Replace the Safe and keystore filename placeholders; never paste a user private key.

```bash
SAFE_ADDRESS="0xYOUR_SAFE_ADDRESS"
KEYSTORE_FILENAME="YOUR_AGENT_KEYSTORE_FILENAME"

CHAIN_ID=10143 \
  SAFE_ADDRESS="$SAFE_ADDRESS" \
  PRIVATE_KEY="$(cast wallet decrypt-keystore \
    --keystore-dir ~/.monskills/keystore \
    "$KEYSTORE_FILENAME" \
    --unsafe-password "" | awk '{print $NF}')" \
  DEPLOYMENT_BYTECODE="$(node contracts/scripts/prepare-safe-deployment.mjs --bytecode)" \
  bash ".agents/skills/monskill/wallet/utils/propose.sh"
```

This is the installed `propose.sh` wrapper, not a project-owned proposer. Do not pipe, summarize, truncate, or reformat its output: the printed QR code must remain intact. After it runs, ask the user only to approve and execute the Safe transaction and return its execution transaction hash.

### 3. Validate the executed deployment

After the user returns the execution hash:

```powershell
npm run verify:deployment -- 0xTRANSACTION_HASH
```

The command performs a production build, then makes read-only RPC calls. It verifies chain ID `10143`, requires a successful receipt, decodes the indexed `ContractCreation(address)` event from the CreateCall/Safe delegatecall context, and requires the deployed runtime bytecode to exactly match the production `RepRegistry` artifact. It then prints the deployed address, expected and actual bytecode hashes, and explorer links. The receipt's top-level `contractAddress` is intentionally not used for a Safe deployment.

This is on-chain deployment validation, not source verification.

### 4. Prepare all-explorer source verification

Production compilation disables the metadata source hash in both Hardhat and Foundry. `prepare-source-verification.mjs` rebuilds with Foundry and refuses to continue unless its creation and runtime bytecode exactly match the Hardhat deployment artifact.

After the deployment validator returns the address, keep the production artifact current and generate the exact Monskills verification request:

```powershell
npm run build
node .\scripts\prepare-source-verification.mjs 0xCONTRACT_ADDRESS > verification-request.json
```

Inspect `verification-request.json`, then submit it to the Monskills multi-explorer endpoint:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "https://agents.devnads.com/v1/verify" `
  -ContentType "application/json" `
  -InFile .\verification-request.json
```

The API result must report success before the contract is labeled source-verified. Keep the request file out of commits; it contains no secret, but it is deployment-specific evidence rather than source.
